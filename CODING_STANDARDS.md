# 项目编码规范

## 概览

本文档记录了 PackyCode Cost Monitor 项目经过一系列重构后建立的编码规范，确保代码质量、一致性和可维护性。

## 重构历史

### 最近的重构提交（按时间倒序）

1. **fbe0314**: `feat: 新增设置页面和视图切换功能`

   - 新增用户界面设置页面
   - 实现主界面与设置页面间的视图切换
   - 引入视图状态管理

2. **b5afcf5**: `refactor: 增强JWT处理逻辑和错误处理`

   - 改进JWT token解析和验证逻辑
   - 增强错误处理机制
   - 优化token过期检查

3. **db632cf**: `refactor: 重构存储结构和字段命名，优化背景脚本逻辑`

   - 统一Chrome Storage字段命名规范
   - 重构背景脚本数据处理逻辑
   - 简化存储结构设计

4. **85e21ef**: `refactor: 优化API URL管理和背景脚本逻辑`

   - 集中化API URL管理
   - 优化背景脚本中的异步处理逻辑
   - 改进错误处理和重试机制

5. **6a0a6a3**: `feat: 引入API模块并优化URL管理`

   - 创建独立的API模块
   - 统一API请求处理方式
   - 标准化URL管理模式

6. **ccd69d7**: `refactor: 移除不必要的lastUpdated字段和相关逻辑`
   - 清理冗余数据字段
   - 简化数据结构
   - 减少不必要的状态追踪

### 当前TypeScript类型规范重构

7. **当前改动**: TypeScript类型定义规范化
   - 统一类型定义到 `/types/index.ts`
   - 将联合类型转换为枚举
   - 消除重复接口定义
   - 规范类型导入语法

---

## TypeScript 编码规范

### 1. 类型定义规范

#### 1.1 统一类型管理

- **所有共享类型必须定义在 `/types/index.ts` 文件中**
- 禁止在组件或工具文件中定义可复用的接口
- 组件特定的 Props 接口可保留在组件文件内

#### 1.2 枚举使用规范

- **优先使用枚举替代字符串联合类型**
- 枚举值必须明确指定字符串值
- 枚举命名使用 PascalCase

```typescript
// ✅ 正确
export enum TokenType {
  API_KEY = "api_key",
  JWT = "jwt"
}

// ❌ 错误
export type TokenType = "api_key" | "jwt"
```

#### 1.3 禁止使用 any 类型

- **严格禁止使用 `any` 类型**
- 使用 `unknown` 替代 `any` 处理不确定类型
- 使用具体的联合类型或泛型

```typescript
// ✅ 正确
export interface JWTPayload {
  [key: string]: unknown // 不是any，是unknown！
  exp?: number
}

// ❌ 错误
export interface JWTPayload {
  [key: string]: any
}
```

#### 1.4 类型导入规范

- **类型专用导入必须使用 `type` 关键字**
- 当启用 `verbatimModuleSyntax` 时必须遵守此规范

```typescript
// ✅ 正确
import { type TokenData, TokenType } from "../types"

// ❌ 错误
import { TokenData, TokenType } from "../types"
```

### 2. 接口定义规范

#### 2.1 接口命名规范

- 接口名使用 PascalCase
- Props接口以 `Props` 结尾
- 数据接口以 `Data` 结尾（Hook返回数据）
- API响应接口以 `Response` 结尾

```typescript
// 组件Props接口
interface UserStatusProps {
  tokenData: TokenData
}

// Hook数据接口
export interface UserInfoData {
  error: null | string
  loading: boolean
  refresh: () => void
  userInfo: null | UserInfo
}

// API响应接口
export interface UserApiResponse {
  daily_budget_usd: number | string
  opus_enabled: boolean
}
```

#### 2.2 接口字段类型规范

- 可选字段使用 `?` 标记
- null值必须明确声明为 `null` 类型
- 联合类型按字母顺序排列

```typescript
export interface TokenData {
  expiry: null | number // null在前
  isValid: boolean
  token: null | string // null在前
  tokenType: null | TokenType // null在前
}
```

### 3. 文件组织规范

#### 3.1 导入顺序规范

1. React 相关导入
2. 第三方库导入
3. 内部类型导入（使用 `type` 关键字）
4. 内部模块导入
5. 相对路径导入

```typescript
import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"

import { type UserInfoData } from "../types"
import { fetchUserInfo, type UserInfo } from "../utils/userInfo"

const storage = new Storage()
```

#### 3.2 类型文件结构

`/types/index.ts` 文件按以下顺序组织：

```typescript
/**
 * 统一类型定义文件
 * 所有共享类型都在这里定义，禁止使用any！
 */

// ===== 枚举定义 =====
export enum TokenType { ... }
export enum ViewType { ... }

// ===== API相关 =====
export interface ApiResponse<T> { ... }
export interface UserApiResponse { ... }

// ===== 数据模型 =====
export interface UserInfo { ... }
export interface TokenData { ... }

// ===== Hook数据类型 =====
export interface UserInfoData { ... }
export interface OpusStatusData { ... }

// ===== React相关 =====
export type ReactChangeEvent<T> = React.ChangeEvent<T>
```

### 4. 组件规范

#### 4.1 组件导入规范

- 从统一类型文件导入所有共享类型
- 使用 `type` 关键字导入类型
- 删除本地重复的接口定义

```typescript
// 组件文件头部
import { type TokenData, type TokenExpiration, TokenType } from "../types"

interface UserStatusProps {
  // 组件特定Props可保留
  tokenData: TokenData
  tokenExpiration: TokenExpiration
}
```

### 5. API和数据处理规范

#### 5.1 API响应类型处理

- API可能返回字符串格式的数字，使用联合类型声明
- 在数据处理时进行显式类型转换

```typescript
// API响应类型
export interface UserApiResponse {
  daily_budget_usd: number | string // API可能返回字符串
  daily_spent_usd: number | string
}

// 数据处理
const userInfo: UserInfo = {
  daily_budget_usd: Number(rawData.daily_budget_usd) || 0, // 显式转换
  daily_spent_usd: Number(rawData.daily_spent_usd) || 0
}
```

### 6. 验证工具

#### 6.1 必须通过的检查

项目提交前必须通过以下检查：

```bash
# TypeScript类型检查
pnpm type-check

# ESLint代码规范检查
pnpm lint

# Prettier格式化检查
pnpm format:check
```

#### 6.2 开发时自动修复

```bash
# 自动修复ESLint问题
pnpm lint:fix

# 自动格式化代码
pnpm format
```

## 最佳实践

### 1. 重构原则

- **渐进式重构**：每次重构专注一个方面（如这次专注类型定义）
- **向后兼容**：确保重构不破坏现有功能
- **测试验证**：通过类型检查和linting验证重构结果

### 2. 代码审查要点

- 检查是否使用了 `any` 类型
- 验证类型导入是否使用 `type` 关键字
- 确认接口定义是否在正确位置
- 检查枚举使用是否规范

### 3. 持续改进

- 定期审查类型定义的合理性
- 根据业务发展调整类型结构
- 保持文档与代码同步更新

---

## 总结

通过这一系列的重构，项目建立了完整的TypeScript编码规范体系：

1. **统一管理**：所有类型集中在 `/types/index.ts`
2. **类型安全**：消除 `any` 使用，规范类型导入
3. **代码一致性**：统一接口命名和组织方式
4. **可维护性**：清晰的文件结构和导入规范
5. **质量保证**：完整的验证工具链

遵循这些规范将确保项目代码的长期可维护性和团队协作效率。
