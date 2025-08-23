# 开发工具设计规范

> 本文档记录了 `@dev-tools/` 模块的设计理念、架构决策和开发规范

## 设计背景

### 问题分析

在重构前，原有的 `@debug/` 模块存在以下问题：

1. **接口不一致** - 5种不同的返回格式，违反API设计一致性原则
2. **全局污染** - 6个函数直接注册到 `window` 对象
3. **紧耦合** - 直接导入业务模块，边界模糊
4. **类型不安全** - 大量使用 `Record<string, unknown>`
5. **维护困难** - 调试代码散布各处，职责不清

### 设计目标

基于四位传奇架构师（Linus Torvalds、Dan Abramov、Joshua Bloch、Martin Fowler）的讨论共识：

- **简单性优于完美性** - 修复现有问题而非重写整个系统
- **统一接口** - 所有验证工具使用一致的结果格式
- **清晰边界** - 通过依赖注入避免与业务代码耦合
- **条件编译** - 生产环境不包含调试代码

## 架构设计

### 核心组件

```
dev-tools/
├── types.ts          # 统一类型定义
├── validator.ts      # 验证器主类
└── index.ts          # 对外接口
```

### 依赖注入架构

```typescript
interface DevToolsDependencies {
  apiConfigManager: ApiConfigManager
  storage: StorageManager
  logger: typeof loggers.debug
}

class DevToolsValidator {
  constructor(dependencies: DevToolsDependencies) {
    // 通过依赖注入避免直接导入业务模块
  }
}
```

**设计优势：**

- 🔒 **边界清晰** - 验证逻辑与业务逻辑分离
- 🧪 **可测试** - 依赖可以被模拟替换
- 🔄 **可扩展** - 新的依赖可以轻松添加

### 统一接口规范

#### ValidationResult 标准格式

```typescript
interface ValidationResult {
  success: boolean // 验证是否成功
  summary: string // 结果概要
  issues: ValidationIssue[] // 问题详情列表
  timestamp: Date // 验证时间戳
  validatorId: string // 验证器标识
}
```

#### 问题分级系统

```typescript
enum ValidationLevel {
  ERROR = "error", // 阻塞性错误
  WARNING = "warning", // 警告性问题
  INFO = "info" // 信息性提示
}

interface ValidationIssue {
  level: ValidationLevel
  message: string // 问题描述
  suggestion?: string // 修复建议（可选）
}
```

**设计原则：**

- 🎯 **结果可预测** - 所有验证器返回相同结构
- 📊 **问题可分级** - 错误、警告、信息清晰区分
- 💡 **可操作** - 提供具体的修复建议

## 开发规范

### 1. 新增验证器

添加新的验证器需要以下步骤：

```typescript
// 1. 在 DevToolsValidator 类中添加验证方法
async validateNewFeature(): Promise<ValidationResult> {
  const validatorId = 'new-feature'

  try {
    // 验证逻辑
    const issues: ValidationIssue[] = []

    // 检查条件
    if (!someCondition) {
      issues.push(this.createIssue(
        ValidationLevel.ERROR,
        "具体问题描述",
        "修复建议"
      ))
    }

    const success = issues.filter(i => i.level === ValidationLevel.ERROR).length === 0

    return this.createResult(
      validatorId,
      success,
      success ? '验证通过' : '验证失败',
      issues
    )

  } catch (error) {
    return this.createResult(
      validatorId,
      false,
      `验证异常: ${error.message}`,
      [this.createIssue(ValidationLevel.ERROR, error.message)]
    )
  }
}

// 2. 在 devTools 对象中添加便捷方法
async validateNewFeature() {
  const validator = await createDevToolsValidator()
  return await validator.validateNewFeature()
}

// 3. 更新 getValidatorConfigs() 方法
getValidatorConfigs(): ValidatorConfig[] {
  return [
    // 现有配置...
    {
      id: "new-feature",
      name: "新功能验证",
      description: "验证新功能的配置和状态",
      enabled: true
    }
  ]
}
```

### 2. 错误处理模式

**标准错误处理结构：**

```typescript
try {
  // 验证逻辑
  this.deps.logger.info("🔍 开始验证...")

  const issues: ValidationIssue[] = []

  // 具体检查
  if (errorCondition) {
    issues.push(this.createIssue(ValidationLevel.ERROR, "错误描述", "修复建议"))
  }

  if (warningCondition) {
    issues.push(
      this.createIssue(ValidationLevel.WARNING, "警告描述", "改进建议")
    )
  }

  // 判断成功标准（只有ERROR级别才算失败）
  const success =
    issues.filter((i) => i.level === ValidationLevel.ERROR).length === 0

  this.deps.logger.info(`验证${success ? "通过" : "失败"}`)

  return this.createResult(validatorId, success, summary, issues)
} catch (error) {
  this.deps.logger.error("验证失败:", error)

  return this.createResult(
    validatorId,
    false,
    `验证异常: ${error instanceof Error ? error.message : String(error)}`,
    [this.createIssue(ValidationLevel.ERROR, error.message)]
  )
}
```

### 3. 命名规范

- **验证器ID** - 使用 kebab-case：`api-config`、`account-switching`
- **验证方法** - 使用 validateXxx 前缀：`validateApiConfiguration()`
- **便捷方法** - 简化命名：`validateAll()`、`validatePermissions()`

### 4. 日志规范

```typescript
// 开始验证
this.deps.logger.info("🔍 验证API配置...")

// 成功情况
this.deps.logger.info("✅ API配置验证通过")

// 失败情况
this.deps.logger.error("❌ API配置验证失败:", error)

// 警告情况
this.deps.logger.warn("⚠️ 发现配置问题")
```

## 使用指南

### 基础用法

```typescript
import { devTools } from "~/dev-tools"

// 运行所有验证
const results = await devTools.validateAll()

// 单独验证
const apiResult = await devTools.validateApiConfig()
const permissionResult = await devTools.validatePermissions()
const accountResult = await devTools.validateAccountSwitching()

// 处理结果
results.forEach((result) => {
  console.log(`${result.success ? "✅" : "❌"} ${result.summary}`)

  result.issues.forEach((issue) => {
    const icon =
      issue.level === "error" ? "❌" : issue.level === "warning" ? "⚠️" : "ℹ️"
    console.log(`  ${icon} ${issue.message}`)
    if (issue.suggestion) {
      console.log(`     💡 ${issue.suggestion}`)
    }
  })
})
```

### 在组件中使用

```typescript
const formatValidationResults = (results: ValidationResult[]): string => {
  let output = ""

  results.forEach((result) => {
    output += `\n🔍 ${result.validatorId} (${result.timestamp.toLocaleTimeString()})\n`
    output += `${result.success ? "✅" : "❌"} ${result.summary}\n`

    if (result.issues.length > 0) {
      result.issues.forEach((issue) => {
        const icon =
          issue.level === "error"
            ? "❌"
            : issue.level === "warning"
              ? "⚠️"
              : "ℹ️"
        output += `  ${icon} ${issue.message}\n`
        if (issue.suggestion) {
          output += `     💡 ${issue.suggestion}\n`
        }
      })
    }
  })

  return output
}
```

## 设计决策记录

### 为什么选择依赖注入？

**决策：** 使用构造函数注入依赖，而不是直接导入模块

**理由：**

- Martin Fowler：避免紧耦合，提升可测试性
- Joshua Bloch：清晰的API边界，明确依赖关系
- Dan Abramov：便于模拟和单元测试

**实现：**

```typescript
// ❌ 避免这样做
import { apiConfigManager } from "~/api/config"

// ✅ 推荐这样做
constructor(dependencies: DevToolsDependencies) {
  this.deps = dependencies
}
```

### 为什么使用统一的结果格式？

**决策：** 所有验证器返回 ValidationResult 格式

**理由：**

- Joshua Bloch：API一致性，避免客户端代码复杂性
- Dan Abramov：可预测的接口，提升开发者体验
- Linus Torvalds：简单直接，易于理解

**对比：**

```typescript
// ❌ 重构前：多种不同格式
{ success: boolean, message: string, details: Record<string, unknown> }
{ results: {...}, success: boolean }
void // 有些函数没有返回值

// ✅ 重构后：统一格式
interface ValidationResult {
  success: boolean
  summary: string
  issues: ValidationIssue[]
  timestamp: Date
  validatorId: string
}
```

### 为什么移除全局函数？

**决策：** 不在 window 对象上注册全局函数

**理由：**

- Linus Torvalds：全局污染是系统腐化的开始
- Dan Abramov：违反现代前端的模块化原则
- Martin Fowler：破坏了清晰的边界

**替代方案：**

```typescript
// ❌ 重构前
window.testApiKeysPattern = testApiKeysPattern

// ✅ 重构后
import { devTools } from "~/dev-tools"
await devTools.validateApiConfig()
```

## 扩展指南

### 添加新的依赖

如果验证器需要新的依赖（如新的服务或配置），按以下步骤：

1. **更新依赖接口**

```typescript
interface DevToolsDependencies {
  apiConfigManager: ApiConfigManager
  storage: StorageManager
  logger: typeof loggers.debug
  newService: NewService // 新增依赖
}
```

2. **更新工厂函数**

```typescript
async function createDevToolsValidator(): Promise<DevToolsValidator> {
  const newService = await getNewService() // 获取新依赖

  const dependencies: DevToolsDependencies = {
    apiConfigManager,
    storage,
    logger: loggers.debug,
    newService // 注入新依赖
  }

  return new DevToolsValidator(dependencies)
}
```

3. **在验证器中使用**

```typescript
async validateNewFeature(): Promise<ValidationResult> {
  const result = await this.deps.newService.checkSomething()
  // 使用新服务进行验证
}
```

### 自定义问题类型

如果需要扩展问题类型，可以继承基础接口：

```typescript
interface CustomValidationIssue extends ValidationIssue {
  category: "security" | "performance" | "compatibility"
  severity: number // 0-10 严重程度评分
  affectedComponents: string[]
}
```

## 最佳实践

### 1. 验证逻辑设计

- **单一职责** - 每个验证器专注一个领域
- **快速失败** - 遇到错误立即返回，避免无意义的后续检查
- **信息丰富** - 提供足够的上下文和修复建议

### 2. 性能考量

- **并行执行** - `runAllValidations()` 使用 `Promise.all` 并行执行
- **轻量级检查** - 避免重量级操作，优先检查简单条件
- **缓存策略** - 对于expensive的检查考虑结果缓存

### 3. 用户体验

- **渐进式信息** - 从概要到详情，层次清晰
- **可操作建议** - 每个问题都应该有明确的解决方案
- **时间戳** - 帮助用户了解检查的时效性

## 总结

重构后的 `@dev-tools/` 模块体现了优秀软件设计的核心原则：

- 🎯 **简洁性** - 简单的正确方案胜过复杂的完美方案
- 🔒 **可维护性** - 清晰的边界和依赖关系
- 🧪 **可测试性** - 依赖注入支持单元测试
- 📏 **一致性** - 统一的接口和返回格式
- 🚀 **可扩展性** - 新功能易于集成

这个设计为项目的长期发展奠定了坚实的基础，同时保持了工具的实用性和开发者友好性。
