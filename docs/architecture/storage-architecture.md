# Chrome Extension 存储架构设计

> **⚠️ 废弃通知**
>
> 本文档描述的版本感知存储架构已被**多账号存储架构**替代。
>
> **主要变更**:
> - ❌ 不再使用 `StorageManager.getCurrentVersion()` 和版本化存储键
> - ✅ 使用 `MultiAccountStorageManager` 管理多账号数据
> - ✅ 每个账号的数据使用 `account_{accountId}_info` 聚合键存储
> - ✅ 账号站点信息存储在 `Account.site` (PackySite 枚举)
>
> **新架构文档**: [CLAUDE.md - Multi-Account Architecture](../../CLAUDE.md#multi-account-architecture-v350)
>
> 本文档仅供参考历史架构设计和设计理念。

---

> 本文档深度解析 PackyCode Cost Monitor 的存储系统架构，重点介绍 StorageManager 重构历程和技术实现细节。
>
> **相关文档**: [版本化存储系统](../guides/versioned-storage-guide.md) | [日志通信机制](log-bridge-design.md)

## 1. 架构概览

PackyCode Cost Monitor 使用基于 Plasmo Storage 的多层存储架构，核心特点：

- **版本感知存储管理**：支持公交车/滴滴车模式的数据隔离
- **跨环境数据同步**：popup 与 background 间的无缝数据共享
- **响应式数据更新**：基于 Plasmo Storage watch 的实时 UI 同步

## 2. StorageManager 核心设计

### 设计理念

StorageManager 的**唯一职责**是抹平 AccountVersion 给 storage key 带来的差异，让业务方能够无感知地操作正确版本的数据。

### 核心架构

```typescript
/**
 * StorageManager - 版本感知的存储管理器
 */
export class StorageManager {
  private _storage: Storage // Plasmo Storage 实例
  private currentVersion: AccountVersion // 当前版本状态缓存
  private versionChangeCallbacks = new Set<Callback>()

  // 受控的存储操作 API
  async get<T>(domain: string): Promise<T | null>
  async set<T>(domain: string, value: T, override?: boolean): Promise<void> // 智能合并+强制覆盖选项
  async remove(domain: string): Promise<void>

  // 版本感知的监听机制
  watch(config: Record<string, Callback>): void

  // 版本管理
  getCurrentVersion(): AccountVersion
  async initialize(): Promise<void>
}
```

### 版本同步机制

```
版本变更触发链：

用户操作修改偏好
    ↓
Plasmo Storage 检测到 user.preference 变化
    ↓
StorageManager.syncVersionFromStorage()
    ↓
更新内部 currentVersion 状态
    ↓
触发 versionChangeCallbacks 通知业务层
    ↓
业务层重新获取版本化数据
```

### API 设计原则

1. **受控 API 暴露**：仅暴露 `get/set/remove/watch` 必要操作，防止绕过版本抽象
2. **智能深度合并**：`set` 方法默认使用 lodash `merge` 进行深度合并，正确处理嵌套对象
3. **可选强制覆盖**：通过 `override` 参数支持数据清理等需要完全替换的场景
4. **响应式版本切换**：watch 方法自动处理版本变化，重新建立监听
5. **同步键生成**：内部键生成保持同步避免循环依赖

## 3. 存储域设计与数据结构

### 版本隔离策略

```typescript
// 内部版本化存储键生成规则（private 方法）
// 业务代码无需关心具体的键生成逻辑
if (domain === StorageDomain.USER_PREFERENCE) {
  return domain // 用户偏好全局共享
}
return `${this.currentVersion}.${domain}` // 其他域按版本隔离
```

### 存储域定义

#### 认证领域 (版本隔离)

- `auth`: 认证信息
  ```typescript
  {
    token: string         // JWT或API Key
    type: "jwt" | "api_key"  // 令牌类型
    expiry?: number       // JWT过期时间戳（毫秒）
  }
  ```

#### 用户领域 (版本隔离)

- `user_info`: 用户预算和使用信息
  ```typescript
  {
    budgets: {
      daily: {
        limit: number // 每日预算限额
        spent: number // 每日已消费
      }
      monthly: {
        limit: number // 每月预算限额
        spent: number // 每月已消费
      }
    }
  }
  ```

#### 用户偏好 (全局共享)

- `user_preference`: 用户偏好设置
  ```typescript
  {
    account_version: "shared" | "private" // 账号版本类型
  }
  ```

#### 系统领域 (版本隔离)

- `purchase_config`: PackyCode购买配置
  ```typescript
  {
    anthropicBaseUrl: string
    purchaseDisabled: boolean
    purchaseUrl: string
    supportEmail: string
  }
  ```

## 4. 数据流架构

### 存储操作流程

```
数据写入：
业务层调用 storageManager.set(domain, data)
    ↓
内部生成版本化键
    ↓
Plasmo Storage.set(versionedKey, data)
    ↓
Chrome Storage API 持久化
    ↓
跨环境同步 (popup ↔ background)

数据读取：
业务层调用 storageManager.get(domain)
    ↓
内部生成版本化键
    ↓
Plasmo Storage.get(versionedKey)
    ↓
返回版本化数据
```

### 版本切换流程

```
用户切换账号类型
    ↓
修改 user_preference.account_version
    ↓
Plasmo Storage watch 检测到变化
    ↓
StorageManager.syncVersionFromStorage()
    ↓
更新 currentVersion + 通知回调
    ↓
业务层重新获取对应版本数据
```

## 5. 响应式数据更新系统

### useStorage Hook 集成

```typescript
const useStorage = <T>(domain: string) => {
  const [data, setData] = useState<T | null>(null)

  useEffect(() => {
    const storageManager = await getStorageManager()

    // 使用 StorageManager 的版本感知 watch
    storageManager.watch({
      [domain]: () => {
        if (mounted) {
          refresh() // 重新获取版本化数据
        }
      }
    })
  }, [])

  return { data, refresh }
}
```

### 跨环境同步机制

- **Chrome Storage API**: 底层存储同步机制
- **Plasmo Storage**: 提供统一的存储抽象和 watch 功能
- **StorageManager**: 版本感知层，确保不同环境获取相同版本的数据

### Background 任务数据流

```
Chrome Alarms 定时触发
    ↓
executeAllTasks() 执行数据获取任务
    ↓
storageManager.set() 存储获取的数据
    ↓
Plasmo Storage watch 检测变化
    ↓
Popup UI 自动刷新显示
```

## 6. 认证系统设计

### 双 Token 认证机制

1. **JWT Token**: 从 PackyCode 网站 cookie 自动提取
   - 自动解析过期时间存储
   - 页面访问时自动刷新
2. **API Key**: 通过 webRequest API 拦截检测
   - 长期有效，无过期概念
   - 优先级高于 JWT

### Token 检测与存储

```typescript
// background.ts 中的 token 管理
chrome.tabs.onUpdated.addListener(async (_, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("packycode.com")) {
    const storageManager = await getStorageManager()
    const authData = await storageManager.get<AuthStorage>(StorageDomain.AUTH)

    // 仅在没有 API Key 时才使用 JWT
    if (!authData?.token || authData?.type !== "api_key") {
      // 从 cookie 获取 JWT...
    }
  }
})

// webRequest 监听 API Key 生成
chrome.webRequest.onCompleted.addListener(async (details) => {
  if (details.statusCode === 200 && isApiKeyRequest(details.url)) {
    // 重放请求获取 API Key 并存储...
  }
})
```

## 7. 技术优势与设计决策

### 重构前后对比

| 方面       | 重构前                             | 重构后                        |
| ---------- | ---------------------------------- | ----------------------------- |
| 代码行数   | ~275 行                            | ~247 行                       |
| 核心职责   | 通用存储封装 + 版本管理 + 回调系统 | 专注版本抽象                  |
| 基础设施   | 自制回调 + Plasmo Storage          | lodash merge + Plasmo Storage |
| API 复杂度 | 多套接口混用                       | 统一的受控 API                |
| 版本初始化 | 外部传入                           | 从存储读取                    |
| 权限控制   | 部分方法暴露过多                   | 严格的最小权限原则            |

### 设计优势

1. **性能优化**：

   - 移除冗余回调系统，减少内存占用
   - 使用 lodash merge 的高效深度合并算法
   - 直接基于 Plasmo Storage，调试更直观

2. **架构简化**：

   - 单一职责原则，专注版本抽象
   - 复用成熟基础设施，无重复造轮子
   - 严格的最小权限控制，防止 API 滥用
   - **智能深度合并**：使用 lodash merge 正确处理嵌套对象，减少 90% 手动合并操作

3. **安全与封装**：

   - **最小权限原则**：仅暴露 6 个必要的公共方法
   - **内部实现隐藏**：5 个私有方法处理复杂的版本管理逻辑
   - **防绕过设计**：业务代码无法直接访问存储键生成或版本变化监听
   - **类型安全**：完整的 TypeScript 类型支持

4. **响应式更新**：
   - 版本变化自动同步，业务层无感知
   - 统一的 watch 机制，确保 UI 实时更新
   - 跨环境数据一致性保证

## 9. 权限设计与 API 安全

### 最小权限原则实施

StorageManager 严格遵循最小权限原则，仅暴露业务层真正需要的功能：

#### 公共 API (6个方法)

```typescript
// 数据操作 - 业务层的核心需求
async get<T>(domain: string): Promise<T | null>
async set<T>(domain: string, value: T, override?: boolean): Promise<void>
async remove(domain: string): Promise<void>

// 监听机制 - 响应式数据更新
watch(config: Record<string, Callback>): void

// 版本查询 - 状态检查
getCurrentVersion(): AccountVersion

// 生命周期管理 - 初始化
async initialize(): Promise<void>
```

#### 私有方法 (5个方法)

```typescript
// 版本抽象核心 - 防止业务层绕过版本管理
private getVersionedKey(domain: string): string

// 版本变化监听 - 内部状态同步机制
private onVersionChange(callback: Callback): () => void
private setupVersionWatch(): void
private syncVersionFromStorage(): Promise<void>
private loadVersionFromStorage(): Promise<void>
```

### 安全边界设计

#### 防止绕过机制

1. **存储键生成隔离**：业务代码无法直接生成版本化存储键
2. **版本监听封装**：版本变化的复杂监听逻辑完全内部化
3. **状态同步隐藏**：版本状态同步机制对业务层透明

#### 类型安全保障

```typescript
// 编译时类型检查
await storageManager.set(StorageDomain.USER_INFO, userData) // ✅ 类型安全
await storageManager.get<UserInfo>(StorageDomain.USER_INFO) // ✅ 类型推断

// 防止错误使用
storageManager.getVersionedKey(domain) // ❌ 编译错误 - private 方法
```

### 设计收益

- **维护性**：私有方法可安全重构，不影响业务代码
- **学习成本**：公共 API 表面简洁，易于理解和使用
- **安全性**：防止业务代码误用内部 API 导致版本管理失效
- **扩展性**：内部实现可独立演进，保持向后兼容

## 10. 使用指南

### 推荐使用模式

```typescript
// 基本数据操作
const storageManager = await getStorageManager()

// 读取版本化数据
const userData = await storageManager.get<UserInfo>(StorageDomain.USER_INFO)

// 智能深度合并写入（推荐）- 自动深度合并现有数据
await storageManager.set(StorageDomain.USER_PREFERENCE, {
  account_version: AccountVersion.PRIVATE // 只设置需要修改的字段
})

// 深度合并的优势 - 处理嵌套对象
await storageManager.set(StorageDomain.USER_INFO, {
  budgets: {
    daily: { spent: 15.5 } // 只更新 daily.spent，保留其他字段
  }
})
// 结果：原有的 budgets.daily.limit 和 budgets.monthly 都会保留

// 强制覆盖写入 - 完全替换数据
await storageManager.set(StorageDomain.AUTH, null, true) // 清理认证数据

// 版本感知的数据监听
storageManager.watch({
  [StorageDomain.USER_INFO]: () => {
    // 数据变化时自动触发
    refreshUI()
  }
})
```

### 版本切换操作

```typescript
// 切换到滴滴车模式 - 使用智能合并，无需手动获取现有数据
await storageManager.set(StorageDomain.USER_PREFERENCE, {
  account_version: AccountVersion.PRIVATE
})

// StorageManager 会自动：
// 1. 获取现有的 user_preference 数据
// 2. 合并新的 account_version 字段
// 3. 同步内部版本状态，无需手动处理
```

## 11. 设计约束与扩展边界

### 核心约束

1. **单一职责**：只负责版本抽象，不提供通用存储功能
2. **最小权限**：严格控制公共 API 表面，内部实现对外不可见
3. **受控操作**：限制直接访问底层存储，确保版本一致性
4. **同步键生成**：避免异步键生成导致的循环依赖

### 扩展指南

- ✅ **添加新存储域**：在 `StorageDomain` 中定义即可
- ✅ **添加新版本类型**：修改 `AccountVersion` 枚举
- ❌ **添加复杂存储逻辑**：应在业务层实现
- ❌ **添加自定义回调系统**：使用 Plasmo Storage 的 watch

## 12. 未来维护方向

### 设计哲学

**"简单就是美"** - 当底层工具（Plasmo Storage）足够优秀时，不要添加不必要的抽象层。StorageManager 专注于解决版本抽象这一个具体问题。

### 维护原则

- **保持克制**：新需求优先考虑是否能在业务层解决
- **版本感知优先**：只有真正需要版本感知的功能才加入 StorageManager
- **最小权限坚持**：新增方法优先考虑 private，避免 API 膨胀
- **核心定位不变**：始终保持"版本抽象层"这一核心职责

**关键原则**: 当有疑问时，选择更严格的权限控制。宁可业务层多写几行代码，也不要暴露不必要的内部实现。

---

**设计完成时间**: 2025-08-23  
**架构师**: Claude (Linus & Dan 联合设计)  
**核心理念**: 专注版本抽象，复用成熟基础设施

`★ Insight ─────────────────────────────────────`
**文档整合的设计考量**: 将两个独立文档合并为统一架构文档，通过从宏观到微观的层次化组织，让开发者能够快速理解整个存储系统的设计理念、实现细节和使用方式。

**关键整合策略**:

- 以 StorageManager 为核心展开架构说明
- 将具体的存储域设计整合到统一的版本管理体系中
- 强调响应式数据流和跨环境同步的实现原理
  `─────────────────────────────────────────────────`

---

## 🔗 相关文档

### 实际应用指南

- [版本化存储系统](../guides/versioned-storage-guide.md) - 双账号数据隔离的用户视角
- [滴滴车模式指南](../guides/private-car-mode.md) - 私有账号认证配置

### 系统设计文档

- [日志通信机制](log-bridge-design.md) - Chrome Extension 调试系统架构
- [贡献指南](../developers/contributing.md) - 参与存储系统开发

### 导航

- [返回架构设计目录](README.md)
- [返回文档中心](../README.md)
