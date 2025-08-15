# 贡献指南

首先，感谢您考虑为 PackyCode Cost Monitor 做出贡献！正是因为像您这样的人，这个项目才能成为一个出色的工具。

## 行为准则

参与此项目的每个人都应遵守我们的行为准则。通过参与，您同意维护一个受欢迎和包容的环境。

## 我可以如何贡献？

### 报告 Bug

Bug 通过 [GitHub Issues](https://github.com/94mashiro/packycode-cost/issues) 进行跟踪。创建 issue 时，请：

- **使用清晰的标题** 描述问题
- **详细描述重现步骤**
- **包含期望的行为** 和实际发生的情况
- **提供环境信息**（操作系统、浏览器版本等）
- **如果可能，提供截图或错误日志**

### 建议新功能

我们欢迎新功能建议！请通过 GitHub Issues 提交功能请求：

- **使用清晰的标题** 概述建议的功能
- **详细描述功能** 以及它如何工作
- **解释为什么这个功能有用**
- **如果可能，提供模型或示例**

### 代码贡献

#### 开发环境设置

1. Fork 此仓库
2. 创建您的功能分支：
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. 安装依赖：
   ```bash
   pnpm install
   ```
4. 启动开发服务器：
   ```bash
   pnpm dev
   ```

#### 代码规范

- **TypeScript**：我们使用 TypeScript，请确保代码有适当的类型注解
- **ESLint**：遵循项目的 ESLint 配置
- **Prettier**：使用 Prettier 进行代码格式化
- **命名约定**：
  - 使用 camelCase 命名变量和函数
  - 使用 PascalCase 命名组件和类
  - 使用 kebab-case 命名文件
- **注释**：为复杂逻辑添加清晰的注释

#### 提交规范

我们使用约定式提交格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型包括：**

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式化（不影响代码功能）
- `refactor`: 重构（既不是新功能也不是bug修复）
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

**示例：**

```
feat(popup): add budget progress bar
fix(auth): handle token expiration
docs: update installation guide
```

#### Pull Request 流程

1. **确保代码质量**：

   ```bash
   pnpm lint
   pnpm build
   ```

2. **更新文档**（如果需要）

3. **创建 Pull Request**：

   - 清晰描述您的更改
   - 关联相关的 issue
   - 添加截图（如果是 UI 更改）
   - 确保 CI 检查通过

4. **代码审查**：
   - 响应审查意见
   - 进行必要的修改
   - 保持代码更新

## 项目结构

```
packycode-cost/
├── assets/              # 静态资源
├── components/          # React 组件
├── hooks/              # 自定义 hooks
├── lib/                # 工具库
├── utils/              # 实用函数
├── background.ts       # 后台脚本
├── popup.tsx           # 弹窗组件
└── ...
```

## 开发指南

### 添加新组件

1. 在 `components/` 目录下创建组件文件
2. 使用 TypeScript 和 React hooks
3. 遵循现有的样式约定（Tailwind CSS）
4. 添加适当的类型定义

### 状态管理

我们使用 Plasmo Storage API 进行状态管理：

```typescript
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

// 存储数据
await storage.set("key", value)

// 获取数据
const value = await storage.get("key")
```

### API 集成

所有 API 调用应该：

- 包含适当的错误处理
- 使用 TypeScript 类型
- 遵循现有的认证模式

## 测试

虽然我们目前还没有完整的测试套件，但我们鼓励：

- 手动测试所有更改
- 在不同浏览器中测试
- 验证扩展的核心功能

## 发布流程

1. 更新版本号（维护者负责）
2. 更新 CHANGELOG.md
3. 创建 GitHub Release
4. 构建并上传到 Chrome Web Store

## 获取帮助

如果您需要帮助：

- 查看 [GitHub Issues](https://github.com/94mashiro/packycode-cost/issues)
- 阅读 [Plasmo 文档](https://docs.plasmo.com/)
- 查看 [Chrome Extension 开发指南](https://developer.chrome.com/docs/extensions/)

## 许可证

通过贡献代码，您同意您的贡献将根据项目的 MIT 许可证进行许可。

---

再次感谢您的贡献！ 🎉
