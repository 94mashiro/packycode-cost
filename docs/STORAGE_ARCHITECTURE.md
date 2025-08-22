# Chrome Storage 架构设计

## 存储字段规范

### 认证领域
- `auth`: 认证信息对象
  ```typescript
  {
    token: string         // JWT或API Key
    type: "jwt" | "api_key"  // 令牌类型
    expiry?: number       // JWT过期时间戳（毫秒），仅JWT使用
  }
  ```

### 用户领域
- `user.info`: 用户预算和使用信息
  ```typescript
  {
    budgets: {
      daily: {
        limit: number     // 每日预算限额
        spent: number     // 每日已消费
      }
      monthly: {
        limit: number     // 每月预算限额  
        spent: number     // 每月已消费
      }
    }
  }
  ```

- `user.preference`: 用户偏好设置
  ```typescript
  {
    account_version: "shared" | "private"  // 账号版本类型
  }
  ```

### 系统领域
- `system.preference`: 系统偏好设置
  ```typescript
  {
    opus_enabled?: boolean       // Opus模型开启状态
    purchase_disabled?: boolean  // 购买禁用状态
  }
  ```

- `purchase_config`: PackyCode购买配置（保留原有结构）
  ```typescript
  {
    anthropicBaseUrl: string
    purchaseDisabled: boolean
    purchaseUrl: string
    supportEmail: string
  }
  ```

## 设计原则

### 1. 命名规范
- 使用下划线分隔：`token_type`、`user_info`
- 无冗余前缀：~~packy_token~~ → `token`
- 清晰表达含义：~~cached_user_info~~ → `user_info`

### 2. 存储效率
- JWT存储过期时间而非创建时间，避免重复计算
- API Key无过期概念，不存储时间戳
- 通知状态存储上次值而非时间戳，支持状态比较

### 3. 单一职责
- 每个字段有明确用途
- 避免一个字段多种含义
- 状态检查与更新分离

## 数据流

### Token管理
1. JWT从cookie自动获取，解析exp存储过期时间
2. API Key从webRequest拦截，直接存储无过期
3. 优先使用API Key（长期有效）

### 状态轮询
- 每30秒通过Chrome Alarms轮询
- 用户信息和购买状态独立更新
- 状态变化触发UI自动刷新

### 通知触发
- 比较当前状态与`notification_states`
- 仅在特定变化时触发（如购买从禁用→启用）
- 触发后更新存储的状态值

## 迁移说明

### 已删除字段
- ~~packy_token_timestamp~~：改为存储`token_expiry`
- ~~cache_timestamp~~：30秒轮询无需缓存时间戳
- ~~packy_config_timestamp~~：同上
- ~~purchase_check_error_count~~：错误重试无意义
- ~~last_opus_notification_time~~：改为状态比较
- ~~last_purchase_notification_time~~：同上

### 重命名字段
- `packy_token` → `token`
- `packy_token_type` → `token_type`
- `packy_config` → `purchase_config`
- `cached_user_info` → `user_info`