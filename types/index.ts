/**
 * 统一类型定义文件
 * 所有共享类型都在这里定义，禁止使用any！
 */

// ===== 枚举定义 =====
// 账号版本
export enum AccountVersion {
  PRIVATE = "private",
  SHARED = "shared"
}

/**
 * API 端点类型枚举
 * Joshua Bloch: "枚举是类型安全常量的最佳实践"
 * 用于标识不同的 API 端点，确保编译时类型检查
 */
export enum ApiEndpointType {
  /** API Keys 监听模式 URL */
  API_KEYS_PATTERN = "apiKeysPattern",
  /** 配置 API */
  CONFIG = "config",
  /** 同行消费数据 API (仅滴滴车模式) */
  PEER_SPENDING_TODAY = "peerSpendingToday",
  /** 共享空间 API */
  SHARED_SPACE = "sharedSpace",
  /** 订阅信息 API */
  SUBSCRIPTIONS = "subscriptions",
  /** 用户信息 API */
  USER_INFO = "userInfo"
}

// HTTP请求方法
export enum HttpMethod {
  DELETE = "DELETE",
  GET = "GET",
  POST = "POST",
  PUT = "PUT"
}

/**
 * 页面 URL 类型枚举
 * Martin Fowler: "按职责分离不同类型的常量"
 * 用于标识不同的页面 URL，与 API 端点分离
 */
export enum PageUrlType {
  /** 仪表板页面 */
  DASHBOARD = "dashboard",
  /** 定价页面 */
  PRICING = "pricing"
}

// Token类型
export enum TokenType {
  API_KEY = "api_key",
  JWT = "jwt"
}

// 界面视图类型
export enum ViewType {
  MAIN = "main",
  SETTINGS = "settings"
}

// ===== API Key响应 =====
export interface ApiKeyResponse {
  [key: string]: unknown
  api_key: string
}

export interface ApiRequestOptions {
  data?: unknown
  headers?: Record<string, string>
  method?: HttpMethod
}

// ===== API相关 =====
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

/**
 * 账号分配类型
 */
export type AssignmentType = "auto_assigned" | "user_selected"

// ===== 新的存储结构定义 =====
// 认证信息
export interface AuthStorage {
  expiry?: number
  token: string
  type: TokenType
}

// 用户预算信息
export interface Budget {
  daily: {
    limit: number
    remaining: number
    spent: number
  }
  monthly: {
    limit: number
    remaining: number
    spent: number
  }
}

// ===== JWT相关 =====
export interface JWTPayload {
  [key: string]: unknown // 不是any，是unknown！
  exp?: number
  iat?: number
  sub?: string
}

// ===== 通知状态 =====
export interface NotificationStates {
  opus_enabled?: boolean
  purchase_disabled?: boolean
}

// Hook数据类型
export interface OpusStatusData {
  enabled: boolean | null
  error: null | string
  loading: boolean
}

// ===== 购买状态相关 =====
export interface PackyConfig {
  anthropicBaseUrl: string
  purchaseDisabled: boolean
  purchaseUrl: string
  supportEmail: string
}

/**
 * Peer Spending API 响应结构
 * 仅在滴滴车模式下可用
 */
export interface PeerSpendingApiResponse {
  /** 账号ID */
  account_id: string
  /** 日期 (YYYY-MM-DD) */
  date: string
  /** 同行消费列表 */
  peers: PeerSpendingRecord[]
  /** 时区 */
  timezone: string
}

// ===== Peer Spending 相关 =====
/**
 * 单个同行消费记录
 */
export interface PeerSpendingRecord {
  /** 显示名称（已脱敏） */
  display_name: string
  /** 今日消费金额（美元） */
  spent_usd_today: string
  /** 用户ID */
  user_id: string
}

/**
 * Peer Spending 存储结构
 * 经过计算和转换的数据
 */
export interface PeerSpendingStorage {
  /** 同行今日平均消费（美元） */
  averageSpentToday: number
  /** 数据日期 */
  date: string
  /** 最后更新时间 */
  lastUpdated: string
  /** 同行数量 */
  peerCount: number
  /** 同行消费排行榜（前5名） */
  topPeers: Array<{
    displayName: string
    spentToday: number
  }>
  /** 同行今日总消费（美元） */
  totalSpentToday: number
}

/**
 * 账号订阅计划类型
 */
export type PlanType = "basic" | "premium" | "pro"

export interface PurchaseStatusData {
  config: null | PackyConfig
  error: null | string
  loading: boolean
}

// ===== React相关 =====
export type ReactChangeEvent<T = HTMLElement> = React.ChangeEvent<T>

export type ReactMouseEvent<T = HTMLElement> = React.MouseEvent<T>

// ===== SharedSpace相关 =====
/**
 * 分配的账号信息
 */
export interface SharedAccountAssignment {
  /** 账号ID */
  account_id: string
  /** 分配时间 */
  assigned_at: string
  /** 分配类型 */
  assignment_type: AssignmentType
  /** 描述 */
  description: string
  /** 显示名称 */
  display_name: string
  /** 是否启用 Opus 模型 */
  opus_enabled: boolean
  /** 速率限制重置时间 */
  rate_limit_reset_at: null | string
}

/**
 * SharedSpace API 响应结构
 * 仅用于 API 调用，不存储
 */
export interface SharedSpaceApiResponse {
  /** 分配的账号列表 */
  assignments: SharedAccountAssignment[]
  /** 最大账号数量 */
  max_accounts: number
  /** 订阅计划类型 */
  plan_type: PlanType
  /** 剩余可用插槽数 */
  remaining_slots: number
}

// ===== 认证相关 =====
/**
 * 单个订阅项（完全匹配 API 返回）
 */
export interface SubscriptionApiItem {
  /** 是否在当前周期结束时取消 */
  cancel_at_period_end: boolean
  /** 取消时间（ISO 字符串或 null） */
  canceled_at: null | string
  /** 创建时间（ISO 字符串） */
  created_at: string
  /** 当前周期结束时间（ISO 字符串） */
  current_period_end: string
  /** 当前周期开始时间（ISO 字符串） */
  current_period_start: string
  /** 订阅 ID */
  id: string
  /** 计划 ID */
  plan_id: string
  /** 计划名称 */
  plan_name: string
  /** 计划价格（字符串格式） */
  plan_price: string
  /** 价格保护信息 */
  price_protection: null | SubscriptionPriceProtection
  /** 订阅状态 */
  status: string
  /** Stripe 订阅 ID */
  stripe_subscription_id: string
  /** 试用结束时间（ISO 字符串或 null） */
  trial_end: null | string
  /** 升级详情（当前为 null，类型待确定） */
  upgrade_details: null | unknown
  /** 用户 ID */
  user_id: string
  /** 用户名（当前为 null） */
  user_name: null | string
}

// ===== 订阅系统类型定义 =====

/**
 * 订阅 API 响应结构（基于真实 API）
 */
export interface SubscriptionApiResponse {
  data: SubscriptionApiItem[]
  page: number
  per_page: number
  total: number
  total_pages: number
}

/**
 * 价格保护信息
 */
export interface SubscriptionPriceProtection {
  /** 市场价格 */
  market_price: string
  /** 每月节省金额 */
  monthly_savings: string
  /** 保护价格 */
  protected_price: string
  /** 价格保护过期时间 */
  protection_expires_at: string
}

// 系统偏好
export interface SystemPreferenceStorage {
  opus_enabled?: boolean
  purchase_disabled?: boolean
}

export interface TokenData {
  expiry: null | number
  isValid: boolean
  token: null | string
  tokenType: null | TokenType
}

// Token过期时间信息
export interface TokenExpiration {
  formatted: string
  isExpired: boolean
}

export interface UserApiResponse {
  daily_budget_usd: number | string
  daily_spent_usd: number | string
  monthly_budget_usd: number | string
  monthly_spent_usd: number | string
  opus_enabled: boolean
}

// 用户信息
export interface UserInfo {
  budgets: Budget
  createdAt?: string
  email?: string
  id: string
  name?: string
  updatedAt?: string
}

export interface UserInfoData {
  error: null | string
  loading: boolean
  refresh: () => void
  userInfo: null | UserInfo
}

// 用户偏好
export interface UserPreferenceStorage {
  account_version: AccountVersion
}
