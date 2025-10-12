# 数据流快速参考

> 快速查找常见数据流路径和关键文件

## 📖 目录

- [核心数据流路径](#核心数据流路径)
- [常见业务场景](#常见业务场景)
- [关键类型定义](#关键类型定义)
- [故障排查指南](#故障排查指南)
- [性能优化检查清单](#性能优化检查清单)

---

## 核心数据流路径

### 1. 数据获取流程

```
Chrome Alarm (30秒)
  ↓
executeAllTasks()
  ↓
为每个账号构建 AccountContext { accountId, site, authData }
  ↓
根据 site 过滤任务 (TASK_REGISTRY)
  ↓
并行执行任务 → API 请求
  ↓
存储到 account_{uuid}_info
  ↓
触发 Storage Watch
  ↓
UI 自动更新
```

**关键文件**:
- `modules/tasks/registry.ts` - 任务定义
- `lib/api/PackyCodeApiClient.ts` - API 客户端
- `lib/storage/MultiAccountStorageManager.ts` - 存储管理

### 2. 用户操作流程

```
用户点击刷新按钮
  ↓
handleRefresh() in popup.tsx
  ↓
refreshAuth() + refreshAccounts()
  ↓
executeAll() → executeAllTasks()
  ↓
并行获取所有账号数据
  ↓
Storage 更新 → Watch 触发 → UI 刷新
```

**关键文件**:
- `popup.tsx` - UI 入口
- `hooks/useTaskExecution.ts` - 任务执行 Hook
- `modules/tasks/executor.ts` - 执行器

### 3. 账号切换流程

```
用户选择新账号
  ↓
AccountManager.switchAccount(accountId)
  ↓
更新 ACCOUNT_REGISTRY.activeAccountId
  ↓
Storage Watch 触发
  ↓
MultiAccountStorageManager 重新绑定监听器
  ↓
useStorage hooks 自动 refresh()
  ↓
UI 重新渲染（根据新账号的 site）
```

**关键文件**:
- `lib/account/AccountManager.ts` - 账号管理
- `components/AccountSwitcher.tsx` - 切换器组件
- `hooks/useAccountManager.ts` - 账号管理 Hook

---

## 常见业务场景

### 场景 1: 添加新账号

**用户路径**: 设置页 → 添加账号表单 → 提交

**数据流**:
```typescript
// 1. 用户填写表单
const config: AddAccountConfig = {
  displayName: "我的账号",
  site: PackySite.WWW,
  token: "eyJhbGc...",
  tokenType: TokenType.JWT
}

// 2. 调用 AccountManager
const accountId = await accountManager.addAccount(config)

// 3. 内部流程
- generateAccountId() → UUID
- 创建 Account 对象
- 添加到 registry.accounts[]
- 创建初始 AccountData
- 写入 account_{uuid}_info
- switchAccount(accountId) → 设为激活
- executeAllTasks() → 获取数据
```

**涉及文件**:
- `lib/account/AccountManager.ts:84` - `addAccount()`
- `lib/storage/MultiAccountStorageManager.ts` - 存储写入
- `modules/tasks/registry.ts:99` - `executeAllTasks()`

### 场景 2: 查看预算信息

**用户路径**: 打开 Popup → 自动显示

**数据流**:
```typescript
// 1. BudgetDisplay 组件挂载
<BudgetDisplay />

// 2. useBudgetDisplay() Hook
const { budgetData, loading } = useBudgetDisplay()

// 3. 内部使用
const { data: userInfo } = useStorage(StorageDomain.USER_INFO)

// 4. useStorage 自动
- 初始: storageManager.get(USER_INFO)
- 监听: storage.watch({ USER_INFO: refresh })
- 更新: 自动调用 refresh()
```

**涉及文件**:
- `components/budget/BudgetDisplay.tsx` - 显示组件
- `hooks/infrastructure/useStorage.ts:25` - `useStorage()`
- `lib/storage/MultiAccountStorageManager.ts:104` - `get()`

### 场景 3: Token 过期处理

**触发**: 定时任务 API 请求返回 401

**数据流**:
```typescript
// 1. API 请求失败
httpClient.get(url, {}, authData)
→ 401 Unauthorized

// 2. AuthenticatedClient 捕获
- updateAccountValidity(accountId, false)
- account_{id}_info.isValid = false

// 3. 抛出 AuthenticationError

// 4. 任务函数处理
catch (error) {
  if (error.name === "AuthenticationError") {
    return null  // 静默失败
  }
}

// 5. UI 显示
- 账号列表标记 "Token 无效"
- 用户可更新 token
```

**涉及文件**:
- `lib/request/AuthenticatedClient.ts` - 错误检测
- `lib/account/AccountManager.ts:458` - `updateAccountValidity()`
- `hooks/useAccountManager.ts` - UI 状态展示

### 场景 4: 通知触发

**触发**: 定时任务检测到状态变化

**Opus 通知（WWW 模式）**:
```typescript
// 1. fetchUserInfo 检测
rawData.opus_enabled = true
previousState = systemPref?.opus_enabled

// 2. 判断
shouldNotify = (previous !== true && current === true)

// 3. 检查权限
const enabled = await checkOpusNotificationPermission()
// 读取 USER_PREFERENCE.opus_notification

// 4. 触发
browser.notifications.create(id, {
  title: "PackyCode Opus 状态",
  message: "Claude Opus 模型已开启！"
})
```

**涉及文件**:
- `modules/user/api.ts:54` - Opus 检测
- `utils/notificationPermissions.ts` - 权限检查
- `background.ts:358` - 通知点击处理

---

## 关键类型定义

### AccountContext（）

```typescript
interface AccountContext {
  accountId: string        // 账号 UUID
  site: PackySite          // 站点（WWW/SHARED/CODEX）
  authData: AuthStorage    // 认证信息 { token, type }
  timestamp?: number       // 执行时间戳
}
```

**用途**: 任务执行时的完整上下文，确保站点和 token 匹配

**位置**: `types/account.ts:280`

### AccountData（ 聚合存储）

```typescript
interface AccountData {
  auth: AuthStorage | null
  userInfo: UserInfo | null
  purchaseConfig: PackyConfig | null
  subscriptionInfo: SubscriptionApiResponse | null
  peerSpending: PeerSpendingStorage | null
  systemPreference: SystemPreferenceStorage | null
  notificationStates: NotificationStates
  isValid: boolean
  tokenExpiry?: number
  snapshot?: AccountSnapshot
  lastSyncAt?: number
}
```

**存储键**: `account_{uuid}_info`

**位置**: `types/account.ts:97`

### TaskDefinition

```typescript
interface TaskDefinition {
  type: DataTaskType
  description: string
  handler: (context: AccountContext) => Promise<unknown>
  priority: number
  applicableSites: PackySite[]
}
```

**用途**: 任务注册表中的任务定义

**位置**: `modules/tasks/registry.ts:42`

### StorageDomain

```typescript
enum StorageDomain {
  AUTH = "auth",
  USER_INFO = "user.info",
  PURCHASE_CONFIG = "purchase_config",
  SUBSCRIPTION_INFO = "subscription.info",
  PEER_SPENDING = "peer.spending",
  SYSTEM_PREFERENCE = "system.preference",
  NOTIFICATION_STATES = "notification.states",
  ACCOUNT_REGISTRY = "global.account.registry",
  USER_PREFERENCE = "global.user.preference"
}
```

**用途**: 存储域枚举，用于类型安全的数据访问

**位置**: `lib/storage/domains.ts:24`

---

## 故障排查指南

### 问题 1: UI 不更新 / 数据不刷新

**症状**: 点击刷新后 UI 没有变化，或数据是旧的

**检查步骤**:

1. **检查 Watch 是否正常**
   ```typescript
   // 在 MultiAccountStorageManager.watch() 中添加日志
   logger.info(`🔧 [watch] Setting up watch for aggregate key: ${aggregateKey}`)
   ```
   - 确认监听的是 `account_{id}_info` 而非旧的分散键
   - 确认 watch 回调被触发

2. **检查 Storage 是否写入**
   ```typescript
   // 在任务函数中添加日志
   logger.info(`✅ Data stored to account_${accountId}_info`)
   ```
   - 确认数据写入成功
   - 检查键名是否正确

3. **检查 useStorage Hook**
   ```typescript
   // 在 refresh() 中添加日志
   logger.debug(`useStorage refresh: ${domain}`, result)
   ```
   - 确认 refresh 被调用
   - 确认数据被读取

**常见原因**:
- ✅  已修复：Watch 监听旧键
- ⚠️ activeAccountId 不正确
- ⚠️ 组件未挂载 watch 监听器

### 问题 2: 账号切换后数据混乱

**症状**: 切换账号后显示的是其他账号的数据

**检查步骤**:

1. **检查 activeAccountId**
   ```typescript
   const activeId = await storageManager.getActiveAccountId()
   logger.debug(`Active account: ${activeId}`)
   ```
   - 确认 registry.activeAccountId 正确更新
   - 确认 storageManager 读取的是最新值

2. **检查缓存是否清空**
   ```typescript
   // switchAccount 时应清空缓存
   this.activeAccountIdCache = null
   ```

3. **检查 Watch 是否重新绑定**
   ```typescript
   // setupAccountSwitchWatch 应触发
   logger.info(`🔄 [watch] Active account changed: ${oldId} → ${newId}`)
   ```

**常见原因**:
- ✅  已修复：从 registry 读取 activeAccountId
- ⚠️ 缓存未清空
- ⚠️ Watch 未重新绑定

### 问题 3: Token 失效但未提示

**症状**: API 401 错误但 UI 没有显示

**检查步骤**:

1. **检查错误捕获**
   ```typescript
   catch (error) {
     if (error.name === "AuthenticationError") {
       logger.debug("Auth failed, account marked invalid")
     }
   }
   ```

2. **检查 isValid 状态**
   ```typescript
   const accountData = await storage.get(`account_${id}_info`)
   logger.debug(`Account isValid: ${accountData.isValid}`)
   ```

3. **检查 UI 展示**
   ```typescript
   // 账号列表应显示无效状态
   {!account.isValid && <Badge>Token 无效</Badge>}
   ```

**常见原因**:
- ⚠️ AuthenticationError 未正确抛出
- ⚠️ updateAccountValidity 未调用
- ⚠️ UI 未读取 isValid 状态

### 问题 4: 通知未触发

**症状**: 状态变化但没有收到通知

**检查步骤**:

1. **检查状态变化检测**
   ```typescript
   logger.debug(`Previous: ${previous}, Current: ${current}, Should notify: ${shouldNotify}`)
   ```

2. **检查用户权限**
   ```typescript
   const enabled = await checkOpusNotificationPermission()
   logger.debug(`Notification enabled: ${enabled}`)
   ```
   - 确认 USER_PREFERENCE.opus_notification = true

3. **检查浏览器权限**
   ```typescript
   const permission = await browser.permissions.contains({
     permissions: ['notifications']
   })
   ```

**常见原因**:
- ⚠️ 状态变化检测逻辑错误
- ⚠️ 用户禁用了通知
- ⚠️ 浏览器权限未授予

---

## 性能优化检查清单

### 存储读写优化

- [ ] **使用聚合存储**: 确保使用 `account_{id}_info` 而非分散键
- [ ] **批量更新**: 多个字段更新时使用深度合并而非多次 set
- [ ] **直接读取**: 直接从 Chrome Storage 读取，无需应用层缓存

** 架构决策**：
- ✅ 移除所有应用层缓存
- ✅ 依赖 Chrome Storage 的内存缓存
- ✅ 消除跨实例不一致问题

### 任务执行优化

- [ ] **并行执行**: 确保使用 `Promise.allSettled` 而非串行 await
- [ ] **站点过滤**: 只执行适用于当前站点的任务
- [ ] **优先级排序**: 重要任务（USER_INFO）优先执行

### Hook 优化

- [ ] **避免重复 refresh**: useEffect 依赖数组正确配置
- [ ] **防止重复渲染**: useMemo/useCallback 正确使用
- [ ] **按需加载**: 仅在需要时才加载 AccountData

### Watch 优化

- [ ] **精确监听**: 只监听需要的 domain
- [ ] **引用比较**: 使用 `oldValue !== newValue` 而非深度比较
- [ ] **及时清理**: 组件卸载时清理监听器

---

## 快速命令

### 查看 Storage 数据

```javascript
// 在浏览器 Console 中执行
chrome.storage.local.get(null, (items) => {
  console.log('All storage:', items)
  console.log('Registry:', items['global.account.registry'])
  Object.keys(items).forEach(key => {
    if (key.startsWith('account_')) {
      console.log(key, items[key])
    }
  })
})
```

### 清空所有数据（慎用）

```javascript
chrome.storage.local.clear(() => {
  console.log('Storage cleared')
  chrome.runtime.reload()
})
```

### 触发手动数据刷新

```javascript
// 在 Background Service Worker Console 中执行
executeAllTasks().then(result => {
  console.log('Refresh result:', result)
})
```

---

## 相关文档

- [完整数据流分析](./DATA_FLOW_ANALYSIS.md) - 详细的架构分析
- [CLAUDE.md](../../CLAUDE.md) - 项目开发指南
- [README.md](../../docs/README.md) - 项目文档索引

---

**版本**: v1.0.0
**最后更新**: 2025-10-12
