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
  AccountVersion,
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
 * 账号实体 - 多账号管理的核心数据结构
 *
 * 每个账号代表一个独立的认证身份，拥有独立的数据空间
 */
export interface Account {
  // === 元数据 ===
  /** 账号创建时间（毫秒时间戳） */
  createdAt: number

  // === 用户信息 ===
  /** 用户自定义显示名称 */
  displayName: string

  /** 邮箱地址（如果可获取） */
  email?: string

  // === 身份标识 ===
  /** UUID - 账号唯一标识（基于 token hash 生成） */
  readonly id: string

  // === 状态标记 ===
  /** 是否为当前激活账号 */
  isActive: boolean

  /** Token 是否有效（服务器验证结果） */
  isValid: boolean

  // === 元数据 ===
  /** 最后数据同步时间 */
  lastSyncAt?: number

  /** 最后使用时间（用于 LRU 缓存） */
  lastUsedAt: number

  // === 快照数据（用于列表显示，避免频繁API调用） ===
  /**
   * 账号数据快照
   * 在账号列表中显示关键信息，无需激活账号即可查看
   */
  snapshot?: AccountSnapshot

  // === 认证信息 ===
  /** 当前有效的认证令牌 */
  token: string

  /** JWT 过期时间（毫秒时间戳，API Key 无此字段） */
  tokenExpiry?: number

  /** JWT | API_KEY */
  tokenType: TokenType

  // === 身份标识 ===
  /** 账号类型（公交车/滴滴车/Codex） */
  readonly type: AccountVersion

  /** API 返回的用户ID */
  userId?: string
}

/**
 * 账号集合配置 - 管理每种类型的激活账号
 *
 * 设计思路：
 * - 每种账号类型（SHARED/PRIVATE/CODEX_SHARED）都有一个当前激活的账号
 * - 切换账号类型时，自动切换到该类型的激活账号
 * - 值为 null 表示该类型还没有添加任何账号
 */
export interface AccountCollection {
  [AccountVersion.CODEX_SHARED]: null | string
  [AccountVersion.PRIVATE]: null | string
  [AccountVersion.SHARED]: null | string
}

/**
 * 账号聚合数据 - 单个账号的所有数据（v3.1.0+）
 *
 * 存储位置: account_{uuid}_info
 *
 * 设计目标：
 * - 将原本分散在多个键的数据聚合到单个对象
 * - 减少存储键数量，提升读写性能
 * - 保证数据原子性和一致性
 *
 * @since v3.1.0
 */
export interface AccountData {
  /** 认证信息 */
  auth: AuthStorage | null

  /** 通知状态 */
  notificationStates: NotificationStates

  /** 同行消费（仅滴滴车模式） */
  peerSpending?: null | PeerSpendingStorage

  /** 购买配置 */
  purchaseConfig: null | PackyConfig

  /** 订阅信息 */
  subscriptionInfo: null | SubscriptionApiResponse

  /** 系统偏好 */
  systemPreference: null | SystemPreferenceStorage

  /** 用户信息 */
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
 */
export interface AccountRegistry {
  /** 所有账号列表 */
  accounts: Account[]

  /** 每种类型的当前激活账号ID */
  activeAccounts: AccountCollection

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
 */
export interface AddAccountConfig {
  /** 自定义显示名称（可选） */
  displayName?: string

  /** 认证令牌 */
  token: string

  /** 令牌类型 */
  tokenType: TokenType

  /** 账号类型 */
  type: AccountVersion
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
