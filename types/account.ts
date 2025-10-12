/**
 * 多账号管理系统 - 核心类型定义
 *
 * 设计原则 (Joshua Bloch):
 * 1. 不可变性 - 使用 readonly 防止意外修改
 * 2. 自文档化 - 清晰的字段命名和注释
 * 3. 类型安全 - 避免 any，使用联合类型和枚举
 *
 * @since v3.0.0
 */

import type {
  AuthStorage,
  NotificationStates,
  PackyConfig,
  PeerSpendingStorage,
  SubscriptionApiResponse,
  SystemPreferenceStorage,
  TokenType,
  UserInfo
} from "./index"

/**
 * PackyCode 站点枚举
 *
 * 三个可用站点：
 * - WWW: 主站 (www.packycode.com)
 * - SHARED: 共享站点 (shared.packycode.com)
 * - CODEX: Codex 站点 (codex.packycode.com)
 *
 * @since v3.2.0
 */
export enum PackySite {
  CODEX = "codex.packycode.com",
  SHARED = "shared.packycode.com",
  WWW = "www.packycode.com"
}

/**
 * 账号实体 - 表单数据 + 身份标识
 *
 * 设计原则：
 * - 只包含用户可编辑的表单字段
 * - API 派生字段存储在 AccountData 中
 *
 * @since v3.0.0
 */
export interface Account {
  // === 元数据 ===
  /** 账号创建时间（毫秒时间戳） */
  createdAt: number

  /** 用户自定义显示名称 */
  displayName: string

  // === 身份标识 ===
  /** UUID - 账号唯一标识 */
  readonly id: string

  /** 是否为当前激活账号 */
  isActive: boolean

  /** 最后使用时间（用于 LRU 缓存） */
  lastUsedAt: number

  /**
   * 账号所属站点（必需字段）
   * 用于区分不同的 PackyCode 站点（www/shared/codex）
   * 所有业务逻辑（API endpoint、UI 展示）都基于此字段派生
   *
   * @since v3.2.0
   * @version v3.5.0 改为必需字段，作为账号系统的单一数据源
   */
  site: PackySite

  // === 表单字段（用户可编辑） ===
  /** 认证令牌 */
  token: string

  /** Token 类型（JWT | API_KEY） */
  tokenType: TokenType
}

/**
 * 账号聚合数据 - 单个账号的所有数据
 *
 * 存储位置: account_{uuid}_info
 *
 * 设计目标：
 * - 将原本分散在多个键的数据聚合到单个对象
 * - 包含所有 API 获取的运行时数据
 * - 减少存储键数量，提升读写性能
 * - 保证数据原子性和一致性
 *
 * @since v3.1.0
 */
export interface AccountData {
  // === API 获取的运行时数据 ===
  /** 认证信息 */
  auth: AuthStorage | null

  // === API 派生字段（从 Account 迁移） ===
  /** Token 是否有效（服务器验证结果） */
  isValid: boolean

  /** 最后数据同步时间 */
  lastSyncAt?: number

  /** 通知状态 */
  notificationStates: NotificationStates

  /** 同行消费（仅滴滴车模式） */
  peerSpending?: null | PeerSpendingStorage

  /** 购买配置 */
  purchaseConfig: null | PackyConfig

  /**
   * 账号数据快照
   * 在账号列表中显示关键信息，无需激活账号即可查看
   */
  snapshot?: AccountSnapshot

  /** 订阅信息 */
  subscriptionInfo: null | SubscriptionApiResponse

  /** 系统偏好 */
  systemPreference: null | SystemPreferenceStorage

  /** JWT 过期时间（毫秒时间戳，API Key 无此字段） */
  tokenExpiry?: number

  /** 用户信息（包含 email 等） */
  userInfo: null | UserInfo
}

/**
 * 账号检测结果
 * AccountManager.detectNewAccount() 返回值
 */
export interface AccountDetectionResult {
  /** 如果是已知账号，返回账号ID */
  accountId?: string

  /** 是否为新账号 */
  isNew: boolean
}

/**
 * 账号注册表 - 所有账号的索引和管理配置
 *
 * 存储位置: StorageDomain.ACCOUNT_REGISTRY
 * 作用: 中心化管理所有账号，避免数据分散
 *
 * 设计原则 (v3.4.0+ 重构):
 * - 全局唯一激活账号（而非每种类型一个）
 * - 账号维度的切换（而非类型维度）
 * - 所有账号一视同仁
 */
export interface AccountRegistry {
  /** 所有账号列表 */
  accounts: Account[]

  /** 当前全局激活账号ID */
  activeAccountId: null | string

  /** 数据模型版本（用于未来迁移） */
  version: number
}

/**
 * 账号数据快照
 */
export interface AccountSnapshot {
  /** 账户余额（仅公交车模式） */
  balanceUsd?: string

  /** 日限额快照（美元） */
  dailyLimit: number

  /** 日消费快照（美元） */
  dailySpent: number

  /** 月消费快照（美元） */
  monthlySpent: number

  /** Opus 状态快照 */
  opusEnabled: boolean
}

/**
 * 账号创建配置
 * 用于 AccountManager.addAccount() 方法
 *
 * 设计原则 (v3.5.0+):
 * - site 为必需字段，作为账号的单一数据源
 * - 所有业务逻辑（API endpoint、UI 展示）基于 site 派生
 * - 只包含表单字段，不包含 API 派生字段
 */
export interface AddAccountConfig {
  /** 自定义显示名称（可选） */
  displayName?: string

  /** 账号所属站点（必需） */
  site: PackySite

  /** 认证令牌 */
  token: string

  /** 令牌类型 */
  tokenType: TokenType
}

/**
 * 迁移状态
 * 记录数据迁移的执行状态
 */
export interface MigrationStatus {
  /** 迁移版本 */
  fromVersion: string

  /** 是否已完成迁移 */
  migrated: boolean

  /** 迁移的账号数量 */
  migratedAccounts: number

  /** 迁移时间戳 */
  timestamp: number

  /** 目标版本 */
  toVersion: string
}

/**
 * 账号更新配置
 * 用于 AccountManager.updateAccount() 方法
 *
 * 设计原则 (Joshua Bloch):
 * - 只包含表单字段（用户可编辑）
 * - 所有字段可选，支持部分更新
 * - 不包含 API 派生字段
 *
 * @since v3.2.0
 */
export interface UpdateAccountConfig {
  /** 自定义显示名称 */
  displayName?: string

  /** 账号所属站点 */
  site?: PackySite

  /** 认证令牌 */
  token?: string

  /** 令牌类型 */
  tokenType?: TokenType
}

/**
 * 账号执行上下文
 *
 * 包含任务执行所需的完整账号信息，遵循 "Tell, Don't Ask" 原则。
 * 在任务执行器层一次性构建，贯穿整个执行链路，消除隐式查询。
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "单一数据源，一次性构建上下文"
 * ⚛️ Dan: "显式传递，清晰的数据流"
 * ☕ Bloch: "不可变值对象，完整自包含"
 * 🏛️ Fowler: "Tell, Don't Ask - 告诉而非查询"
 *
 * 架构优势:
 * - 正确性: 站点和 token 完美匹配
 * - 性能: 减少 85%+ storage 读取
 * - 可维护性: 清晰的数据流
 * - 可测试性: 易于 mock
 *
 * @since v3.6.0
 */
export interface AccountContext {
  /** 账号唯一标识 */
  readonly accountId: string

  /** 账号所属站点（用于 API URL 生成） */
  readonly site: PackySite

  /** 认证信息（用于 API 请求） */
  readonly authData: AuthStorage

  /** 执行时间戳（可选，用于调试） */
  readonly timestamp?: number
}
