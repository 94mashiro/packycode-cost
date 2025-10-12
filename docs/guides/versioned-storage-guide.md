# 版本化存储系统 - 双账号数据隔离

> **⚠️ 废弃通知**
>
> 本文档描述的版本化存储架构已被**多账号架构**替代。
>
> **请查阅最新架构**:
> - [CLAUDE.md - Multi-Account Architecture](../../CLAUDE.md#multi-account-architecture-v350)
> - 新架构使用 `account.site` (PackySite) 作为单一数据源
> - 不再使用 `AccountVersion` 和版本化存储键
> - 支持多账号同时存在和管理
>
> 本文档仅供参考历史架构设计。

---

> 本文档介绍 PackyCode Cost Monitor 的版本化存储架构实现，支持公交车和滴滴车两种账号模式的数据隔离。
>
> **相关文档**: [存储架构设计](../architecture/storage-architecture.md) | [滴滴车模式指南](private-car-mode.md)

## 🎯 项目背景

PackyCode Cost Monitor 现在支持两个账号版本：

- **🚌 公交车版本** (共享资源，价格实惠)
- **🚗 滴滴车版本** (独享资源，性能更优)

每个版本对应不同的系统环境，需要隔离存储数据，同时保持开发体验的简洁性。

## 🏗️ 架构设计

### 存储层次结构

```
┌─────────────────────┐
│   React Components  │ ← useAuth(), useUserInfo() 等业务 Hooks
├─────────────────────┤
│  useStorage       │ ← 通用存储 Hook
├─────────────────────┤
│ StorageManager │ ← 核心存储管理器
├─────────────────────┤
│   Plasmo Storage    │ ← Chrome Storage API 封装
└─────────────────────┘
```

### 存储键命名规则

- **版本化数据**: `{version}.{domain}`
  - 示例: `shared.auth`, `private.user.info`
- **全局数据**: `global.{domain}`
  - 示例: `global.user.preference`

## 📁 实现文件结构

```
utils/storage/
├── domains.ts                 # 存储域枚举和类型映射
├── StorageManager.ts  # 核心存储管理器
└── index.ts                   # 工厂函数和导出

hooks/
├── useStorage.ts              # 通用存储 Hook
├── useStorageHooks.ts         # 业务专用 Hooks
└── useVersionSwitcher.ts      # 版本切换 Hook

components/
└── SettingsPage.tsx           # 版本切换界面 (已更新)
```

## 🔧 核心组件说明

### 1. StorageDomain 枚举 (`domains.ts`)

```typescript
export enum StorageDomain {
  // 版本化域
  AUTH = "auth",
  USER_INFO = "user.info",
  PURCHASE_CONFIG = "purchase_config",
  SYSTEM_PREFERENCE = "system.preference",

  // 全局域
  USER_PREFERENCE = "global.user.preference"
}
```

**优势:**

- ✅ 编译时类型检查
- ✅ IDE 自动补全
- ✅ 重构时自动更新
- ✅ 避免字符串拼写错误

### 2. StorageManager 类

**核心功能:**

- 🔄 **同步版本管理** - 避免异步获取版本的性能问题
- 🔧 **自动键生成** - 根据版本和域生成正确的存储键
- 📡 **响应式通知** - 版本切换时通知所有订阅者
- 🧪 **测试友好** - 支持依赖注入

**关键方法:**

```typescript
getCurrentVersion(): AccountVersion          // 同步获取当前版本
setCurrentVersion(version): Promise<void>    // 切换版本并通知
get<T>(domain: string): Promise<T | null>    // 版本感知的数据获取
set<T>(domain, value): Promise<void>         // 版本感知的数据设置
onVersionChange(callback): () => void        // 订阅版本变化
```

### 3. useStorage Hook

**特性:**

- 🎯 **类型安全** - 自动推导数据类型
- 🔄 **响应式** - 版本切换时自动重新加载
- ⚠️ **错误处理** - 统一的错误状态管理
- 🚀 **性能优化** - 避免不必要的重新渲染

**使用示例:**

```typescript
const {
  data: userInfo,
  loading,
  error,
  update
} = useStorage(StorageDomain.USER_INFO)
// data 自动推导为 UserInfoStorage | null 类型
```

### 4. 业务专用 Hooks (`useStorageHooks.ts`)

```typescript
export const useAuth = () => useStorage(StorageDomain.AUTH)
export const useUserInfo = () => useStorage(StorageDomain.USER_INFO)
export const useUserPreference = () => useStorage(StorageDomain.USER_PREFERENCE)
// 等等...
```

**优势:**

- 🎯 **零配置** - 无需传入参数
- 📝 **语义清晰** - 函数名直接表达意图
- 🔒 **类型安全** - 自动类型推导

### 5. useVersionSwitcher Hook

**完整的版本切换功能:**

- 📊 状态管理 (切换进度、错误状态)
- 🔄 响应式更新 (自动触发组件重新加载)
- ⚠️ 错误处理和恢复机制
- ⚡ 防重复切换保护

## 🚀 开发者体验

### Before (复杂)

```typescript
const storage = new Storage()
const [userInfo, setUserInfo] = useState(null)

useEffect(() => {
  const loadData = async () => {
    const pref = await storage.get("user.preference")
    const version = pref?.account_version || AccountVersion.SHARED
    const key = `${version}.user.info`
    const data = await storage.get(key)
    setUserInfo(data)
  }
  loadData()
}, [])
```

### After (简洁)

```typescript
const { data: userInfo, loading } = useUserInfo()
// 完成！版本切换、存储键、响应式更新都被抽象掉了
```

### 版本切换示例

```typescript
const SettingsPage = () => {
  const { data: userPref } = useUserPreference()
  const { switchVersion, switching } = useVersionSwitcher()

  const handleVersionChange = async (e) => {
    const newVersion = e.target.value as AccountVersion
    await switchVersion(newVersion) // 一行代码完成版本切换！
  }

  const currentVersion = userPref?.account_version || AccountVersion.SHARED

  return (
    <select value={currentVersion} onChange={handleVersionChange} disabled={switching}>
      <option value={AccountVersion.SHARED}>🚌 公交车</option>
      <option value={AccountVersion.PRIVATE}>🚗 滴滴车</option>
    </select>
  )
}
```

## 📊 存储数据示例

版本切换后，Chrome Storage 中的数据结构：

```json
{
  // 公交车版本数据
  "shared.auth": { "token": "jwt_token", "type": "jwt" },
  "shared.user.info": { "budgets": { "daily": {...} } },
  "shared.system.preference": { "api_endpoints": {...} },

  // 滴滴车版本数据
  "private.auth": { "token": "api_key_abc", "type": "api_key" },
  "private.user.info": { "budgets": { "daily": {...} } },
  "private.system.preference": { "api_endpoints": {...} },

  // 全局共享数据
  "global.user.preference": {
    "account_version": "shared",
    "theme": "dark"
  }
}
```

## ✅ 实现完成情况

- ✅ **存储域枚举和类型映射** - 类型安全的存储访问
- ✅ **版本感知存储管理器** - 核心业务逻辑
- ✅ **工厂函数和测试支持** - 依赖注入，避免单例问题
- ✅ **通用版本感知 Hook** - 响应式数据访问
- ✅ **业务专用 Hooks** - 零配置的便捷接口
- ✅ **版本切换 Hook** - 完整的切换功能
- ✅ **SettingsPage 组件更新** - 使用新的存储系统

## 🎯 关键优势总结

1. **类型安全** - 编译时发现数据结构错误
2. **零配置** - 使用方无需关心当前版本
3. **响应式** - 版本切换时组件自动更新
4. **性能优秀** - 同步版本管理，避免异步开销
5. **测试友好** - 依赖注入而非单例模式
6. **简洁易用** - 一行代码完成复杂的存储操作

这个架构完美地平衡了 **Linus 的工程实用性** 和 **Dan 的前端响应式需求**，为 PackyCode Cost Monitor 的双版本功能提供了强大而简洁的存储基础。

---

## 🔗 相关文档

### 深度技术文档

- [存储架构设计](../architecture/storage-architecture.md) - StorageManager 重构历程和技术细节
- [日志通信机制](../architecture/log-bridge-design.md) - 调试系统架构设计

### 功能使用指南

- [滴滴车模式指南](private-car-mode.md) - 私有账号模式配置和使用
- [贡献指南](../developers/contributing.md) - 参与项目开发流程

### 导航

- [返回功能指南目录](README.md)
- [返回文档中心](../README.md)
