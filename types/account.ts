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

import type { TokenType, TokenValidationState } from "./index"

/**
 * PackyCode 站点枚举
 *
 * 三个可用站点：
 * - WWW: 主站 (www.packycode.com)
 * - SHARED: 拼车站 (share.packycode.com)
 * - CODEX: Codex站 (codex.packycode.com)
 */
export enum PackySite {
  CODEX = "codex.packycode.com",
  SHARED = "share.packycode.com",
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
   * @version 3.0.0 - 改为必需字段，作为账号系统的单一数据源
   */
  site: PackySite

  // === 表单字段（用户可编辑） ===
  /** 认证令牌 */
  token: string

  /** Token 类型（JWT | API_KEY） */
  tokenType: TokenType
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
 */
export interface AccountContext {
  /** 账号唯一标识 */
  readonly accountId: string

  /** 认证信息（用于 API 请求） */
  readonly authData: import("./index").AuthStorage

  /** 账号所属站点（用于 API URL 生成） */
  readonly site: PackySite

  /** 执行时间戳（可选，用于调试） */
  readonly timestamp?: number
}

/**
 * 账号聚合数据 - 领域驱动设计
 *
 * 存储位置: account_{uuid}_info
 *
 * 五大核心领域：
 * 1. Authentication - 身份与凭证
 * 2. Finance - 预算与消费（计费模式语义隔离）
 * 3. Capabilities - 系统能力
 * 4. Subscription - 订阅服务
 * 5. Collaboration - 团队协作
 */
export interface AccountData {
  auth: AuthDomain
  capabilities: CapabilitiesDomain
  collaboration?: CollaborationDomain
  finance: FinanceDomain
  subscription?: SubscriptionDomain
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
 * 设计原则（重构）:
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
 * 账号创建配置
 * 用于 AccountManager.addAccount() 方法
 *
 * 设计原则：
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
 * 认证领域 - 完整的身份与凭证上下文
 *
 * 合并了原有的 auth, tokenValidation, tokenExpiry
 */
export interface AuthDomain {
  token: null | string
  tokenExpiry?: number
  tokenType: null | TokenType
  validation?: TokenValidationState
}

/**
 * 能力领域 - 系统功能可用性与限流控制
 *
 * 合并了原有的 systemPreference 和 purchaseConfig 的核心字段
 */
export interface CapabilitiesDomain {
  opusEnabled?: boolean
  purchaseDisabled?: boolean
  rateLimitResetAt?: null | string
}

/**
 * 协作领域 - 团队消费统计与排行
 *
 * 仅在 SHARED（滴滴车）模式下存在
 */
export interface CollaborationDomain {
  averageSpent: number
  peerCount: number
  topPeers: Array<{
    name: string
    spent: number
  }>
  totalSpent: number
}

/**
 * 财务领域 - 按量计费与周期计费可共存
 *
 * 设计原则：
 * - payg 和 budget 语义独立，不互斥
 * - WWW 主站主要使用 payg，但也可能有 budget 数据
 * - SHARED/CODEX 主要使用 budget
 * - 组件根据数据存在性决定展示内容
 */
export interface FinanceDomain {
  budget?: {
    daily: {
      limit: number
      spent: number
    }
    monthly: {
      limit: number
      spent: number
    }
  }
  payg?: {
    balance: string
    dailySpent?: number
    totalSpent?: string
  }
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
 * 订阅领域 - 服务计划与周期管理
 *
 * 仅保留第一个订阅项的核心字段
 */
export interface SubscriptionDomain {
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string
  currentPeriodStart: string
  planName: string
  planPrice: string
  status: string
}

/**
 * 账号更新配置
 * 用于 AccountManager.updateAccount() 方法
 *
 * 设计原则 (Joshua Bloch):
 * - 只包含表单字段（用户可编辑）
 * - 所有字段可选，支持部分更新
 * - 不包含 API 派生字段
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
