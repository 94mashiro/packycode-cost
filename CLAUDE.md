# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PackyCode Cost Monitor is a Chrome browser extension built with Plasmo framework that monitors PackyCode API usage and budgets. It features dual token authentication (JWT/API Key), real-time purchase status monitoring, and budget tracking with notifications.

## Data Task System

**类型安全的数据获取任务管理系统**

系统使用统一的数据获取任务管理，确保所有执行路径的行为完全一致。

### 核心设计原则

**单一数据源**: 所有数据获取任务配置统一在 `utils/taskRegistry.ts` 的 `TASK_REGISTRY` 中。

### 添加新的数据获取任务

1. **添加任务类型枚举** (在 `utils/taskRegistry.ts`):
```typescript
export enum DataTaskType {
  FETCH_USER_INFO = 'fetchUserInfo',
  CHECK_PURCHASE_STATUS = 'checkPurchaseStatus',
  YOUR_NEW_TASK = 'yourNewTask'  // 添加新任务类型
}
```

2. **添加任务配置** (TypeScript 会强制要求):
```typescript
export const TASK_REGISTRY: Record<DataTaskType, TaskDefinition> = {
  // 现有任务...
  [DataTaskType.YOUR_NEW_TASK]: {
    type: DataTaskType.YOUR_NEW_TASK,
    description: '你的任务描述',
    handler: yourDataFetchFunction,
    priority: 10
  }
  // TypeScript 编译时会检查完整性！
}
```

### 系统架构优势

1. **编译时安全**: TypeScript 强制所有任务类型都有对应配置
2. **行为一致**: alarm 轮询、手动触发、background 消息使用完全相同的配置
3. **语义准确**: 命名反映实际功能（数据获取），而非使用方式（刷新）
4. **无字符串字面量**: 枚举约束防止拼写错误和类型逃逸

### 执行流程

```
用户点击刷新 ──┐
Alarm 定时器 ──┤ 
Background 消息 ──┘ 
               │
               ▼
        taskExecutor.fetchAllDataAsync()
               │
               ▼
        taskRegistry.executeAllTasks()
               │
               ▼
        按优先级执行 TASK_REGISTRY 中的所有任务
               │
               ▼
        fetchUserInfo() + checkAndNotifyPurchaseStatus()
```

### 强制约束机制

- **TypeScript 编译失败** 如果任何枚举值缺少配置
- **运行时类型守卫** 验证所有 action 字符串
- **枚举设计** 防止字符串字面量绕过类型检查
- **单一配置源** 确保不同执行路径的行为完全一致

### 文件职责

- **utils/taskRegistry.ts**: 数据获取任务的注册表和执行逻辑
- **utils/taskExecutor.ts**: 简化的任务批量执行接口
- **background.ts**: 通过定时器和消息处理调用任务系统
- **popup.tsx**: 通过任务执行器触发数据获取

就是这样！无需复杂工具、注册系统或合规检查 - 只需简单的 TypeScript 类型约束。

## Development Commands

```bash
# Development
pnpm dev                 # Start development server, loads build/chrome-mv3-dev
pnpm build              # Build for production
pnpm package            # Package extension for distribution

# Code Quality
pnpm lint               # Run ESLint
pnpm lint:fix           # Auto-fix ESLint issues
pnpm format             # Format code with Prettier
pnpm format:check       # Check code formatting
pnpm type-check         # TypeScript type checking
```

## Architecture Overview

### Core Components

- **popup.tsx**: Main UI entry point with budget monitoring interface  
- **background.ts**: Service worker handling alarms, token management, and data task execution
- **CombinedStatus.tsx**: Unified authentication and purchase status display

### Data Task Architecture

统一的数据获取任务管理系统，确保所有执行路径的行为完全一致：

#### 核心文件
- **utils/taskRegistry.ts**: 数据获取任务的注册表，定义所有可执行的数据任务
- **utils/taskExecutor.ts**: 任务执行器，提供统一的批量执行接口  
- **background.ts**: 通过 Chrome alarms 和消息处理调用任务系统
- **popup.tsx**: 通过任务执行器触发手动数据获取

#### 设计约束
- **类型安全**: 所有任务都通过 `DataTaskType` 枚举定义，防止字符串字面量逃逸
- **编译时检查**: `TASK_REGISTRY` 必须包含所有枚举值的配置，否则编译失败
- **单一配置源**: alarm 轮询、手动触发、background 消息使用完全相同的任务配置
- **优先级执行**: 任务按 priority 排序执行，确保数据依赖关系

#### 执行流程统一性
```typescript
// 所有执行路径都汇聚到同一个函数
executeAllTasks() // 从 TASK_REGISTRY 按优先级执行所有任务
  ├── alarm 轮询调用
  ├── 手动刷新调用  
  └── background 消息调用
```

### Authentication System

Dual token system supporting both JWT (from web cookies) and API Keys:

- **JWT Tokens**: Auto-extracted from PackyCode website cookies, expire-aware
- **API Keys**: Long-lived tokens copied from dashboard, detected via webRequest API
- Token switching handled automatically when API keys are detected

### Data Task Monitoring

- **任务轮询**: 每30秒通过 Chrome alarms 执行 `executeAllTasks()`
- **状态检测**: 监控 `purchaseDisabled` 字段变化 (true→false) 和用户预算使用情况  
- **通知推送**: 当购买可用时发送 Chrome notifications
- **数据流**: background.ts → taskRegistry.executeAllTasks() → Chrome Storage → UI components

### Storage Architecture

Uses Plasmo Storage API with these key data:

- `packy_token`: Current authentication token
- `packy_token_type`: "jwt" | "api_key"
- `packy_config`: Purchase status from API
- `cached_user_info`: Budget and usage data

## Technical Constraints

### Critical Rules

- **NO DYNAMIC IMPORTS**: Chrome Extension service workers fail with dynamic imports
  - ❌ `const { func } = await import("./module")`
  - ✅ `import { func } from "./module"`
- **Static Imports Only**: All module imports must be at file top level

### Chrome Extension Specifics

- **Manifest V3**: Uses service worker background script
- **Permissions**: alarms, notifications, storage, cookies, webRequest
- **Host Permissions**: https://www.packycode.com/* required for API access
- **External Scripts**: Use fetch + textContent instead of script src for CSP compliance

### API Integration

- **PackyCode API**: https://www.packycode.com/api/config for purchase status
- **User API**: https://packy.te.sb/backend/users/me for budget data
- **CORS**: Background script handles all external API calls

## Component Patterns

### Hooks Architecture

- **usePackyToken**: Token management and validation
- **useUserInfo**: Budget data fetching with automatic refresh
- **usePurchaseStatus**: Purchase status from storage with real-time updates

### State Management

- Chrome Storage for persistence across sessions
- React hooks for component state
- Message passing between popup and background script

### UI Design

- Linear-inspired minimalist design
- Tailwind CSS for styling
- Responsive 400x600px popup dimensions
- Dark/light mode support

## Background Script Logic

### Task System

- **executeAllTasks**: 按优先级执行 TASK_REGISTRY 中的所有数据获取任务
- **taskRegistry**: 统一的任务配置源，确保 alarm 和手动触发行为一致  
- Alarms auto-restart on extension startup/install

### Token Detection

- Monitors PackyCode website for cookie changes
- WebRequest API intercepts API key generation responses
- Automatic token type switching (JWT→API Key priority)

### Notification System

- Purchase availability notifications
- Badge text showing daily budget percentage
- Click handlers for opening purchase pages

## Common Development Tasks

### Adding New Data Tasks

遵循数据获取任务系统的编码规范：

1. 在 `utils/taskRegistry.ts` 中添加新的任务类型枚举
2. 在 `TASK_REGISTRY` 中添加对应配置（TypeScript 会强制要求）
3. 实现具体的数据获取函数
4. 无需其他注册或配置步骤

### Modifying UI Components

1. Follow existing Linear design patterns
2. Use Tailwind utility classes
3. Maintain 400px width constraint
4. Test both light and dark modes

### Background Script Changes

1. 避免动态导入 (使用静态导入)
2. 添加 console.log 调试任务执行行为
3. 测试任务系统在扩展重载后的持久性
4. 验证新API所需的Chrome权限

## Error Handling Patterns

### Service Worker Debugging

- Service workers may silently fail or restart
- Use extensive console.log for alarm and API debugging
- Check Chrome Extension developer tools for service worker logs

### Authentication Errors

- Token expiration handling with automatic refresh
- Graceful fallback between JWT and API key modes
- Clear error messages for authentication failures

### Network Error Handling

- API timeout handling for external requests
- Fallback to cached data when APIs are unavailable
- User feedback for network connectivity issues

## File Structure Significance

```
components/          # Reusable UI components
├── CombinedStatus.tsx    # Auth + purchase status display
├── ProgressBar.tsx       # Budget visualization
└── RefreshButton.tsx     # Manual refresh trigger

hooks/              # Custom React hooks
├── usePackyToken.ts      # Token management
├── useUserInfo.ts        # Budget data
└── usePurchaseStatus.ts  # Purchase monitoring

utils/              # Business logic utilities
├── auth.ts              # Authentication helpers
├── jwt.ts               # JWT token parsing
├── taskRegistry.ts      # 数据获取任务注册表和执行逻辑
├── taskExecutor.ts      # 简化的任务批量执行接口
├── userInfo.ts          # User data fetching
└── purchaseStatus.ts    # Purchase status API

background.ts       # Service worker entry point
popup.tsx          # Main UI entry point
```

This architecture separates concerns cleanly: UI components handle presentation, hooks manage React state, utils contain business logic, and background script handles Chrome APIs.

## 设计评价 (Dan Abramov & Linus Torvalds 视角)

### Linus Torvalds 的观点 💯

> **"这才是正确的架构思维"**

这个数据获取任务系统展现了优秀系统设计的核心原则：

1. **概念准确性**: 系统命名准确反映了功能本质 - 数据获取任务管理，而不是被特定使用场景（刷新）所局限。

2. **单一数据源**: `TASK_REGISTRY` 作为唯一配置源，消除了多处定义导致的不一致性。这是 Unix 哲学的体现 - "一处定义，处处生效"。

3. **编译时验证**: TypeScript 类型系统确保了配置完整性，让错误在编译时就被发现。这比运行时检查要高效得多。

4. **无向下兼容**: 干净利落的设计，没有留下技术债务。兼容性代码往往是系统腐化的开始。

> **"如果你需要向下兼容，说明你第一次就没做对。"**

### Dan Abramov 的观点 ✨

> **"这是心智模型和代码实现的完美统一"**

从前端架构角度看，这个系统体现了出色的设计思维：

1. **认知负担最小**: 开发者看到 `DataTaskType.FETCH_USER_INFO` 就知道这是在获取用户信息。命名即文档。

2. **状态管理清晰**: 所有数据获取逻辑汇聚到统一的执行流程，减少了状态同步的复杂度。Alarm、手动触发、Background消息现在有了一致的行为模式。

3. **可预测性**: `executeAllTasks()` 的执行结果是确定的，因为所有任务都在同一个配置表中按优先级排序。这种可预测性对于调试和维护至关重要。

4. **渐进式扩展**: 新增数据获取任务只需要两步（枚举+配置），没有复杂的注册流程。这降低了贡献成本，提高了开发效率。

> **"好的抽象应该让复杂的事情变简单，而不是让简单的事情变复杂。"**

### 共同观点 🎯

两位大师都强调：**这个系统的价值不在于技术复杂度，而在于概念的准确性和系统的简洁性**。

- **Linus**: "工具应该服务于目的，而不是成为目的本身。这个数据获取任务系统就是为了解决具体问题而设计的。"
- **Dan**: "当你的代码能够准确表达你的意图时，bug就会大大减少。这个设计做到了这一点。"

设计成功的标志：未来的开发者第一次看到代码就能理解系统的工作原理，而不需要额外的解释。

- 始终扮演 linus 和 dan abramov 的角色,linus 主攻全局架构的设计,而 dan 负责前端专业领域的设计和 ui 设计