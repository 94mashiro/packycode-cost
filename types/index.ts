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

// HTTP请求方法
export enum HttpMethod {
  DELETE = "DELETE",
  GET = "GET",
  POST = "POST",
  PUT = "PUT"
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

// ===== Chrome Storage变更事件 =====
export interface StorageChanges {
  [key: string]: chrome.storage.StorageChange
}

// ===== 认证相关 =====

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

// ===== 用户相关 =====
export interface UserInfo {
  daily_budget_usd: number
  daily_spent_usd: number
  monthly_budget_usd: number
  monthly_spent_usd: number
  opus_enabled: boolean
}

export interface UserInfoData {
  error: null | string
  loading: boolean
  refresh: () => void
  userInfo: null | UserInfo
}
