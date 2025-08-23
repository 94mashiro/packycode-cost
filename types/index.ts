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

export interface PurchaseStatusData {
  config: null | PackyConfig
  error: null | string
  loading: boolean
}

// ===== React相关 =====
export type ReactChangeEvent<T = HTMLElement> = React.ChangeEvent<T>

export type ReactMouseEvent<T = HTMLElement> = React.MouseEvent<T>

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

// ===== 认证相关 =====

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
