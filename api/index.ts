/**
 * API 模块 - 统一管理所有 API 端点和请求
 * 不要再到处硬编码 URL 了！
 */

import type { PackyConfig } from "../utils/purchaseStatus"

import { get } from "../utils/request"

/**
 * API 基础配置
 */
const API_ENDPOINTS = {
  PACKY: {
    BASE: "https://www.packycode.com",
    CONFIG: "/api/config",
    USER_INFO: "/api/backend/users/info"
  }
} as const

/**
 * PackyCode API
 */
export const packyApi = {
  /**
   * 获取购买配置
   * @returns 购买状态、URL等配置信息
   */
  async getConfig(): Promise<{
    data?: PackyConfig
    error?: string
    success: boolean
  }> {
    return get<PackyConfig>(
      `${API_ENDPOINTS.PACKY.BASE}${API_ENDPOINTS.PACKY.CONFIG}`
    )
  }
}

/**
 * 后端用户 API
 */
export const userApi = {
  /**
   * 获取用户信息（预算、使用量等）
   * @param token 认证令牌
   * @param tokenType 令牌类型
   * @returns 用户预算和使用信息
   */
  async getUserInfo(
    token: string,
    _tokenType: "api_key" | "jwt" // 暂时保留参数签名兼容性，但不使用
  ): Promise<{ data?: any; error?: string; success: boolean }> {
    // 目前只有一个端点，都用 Bearer token
    const url = `${API_ENDPOINTS.PACKY.BASE}${API_ENDPOINTS.PACKY.USER_INFO}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }

    return get<any>(url, { headers })
  }
}

/**
 * 导出 API 端点常量（用于需要直接访问的场景）
 */
export const API_URLS = {
  // 其他服务 - 这些暂时硬编码，因为不属于主 API
  NETWORK_TEST: "https://packy.te.sb/",
  // API 端点
  PACKY_CONFIG: `${API_ENDPOINTS.PACKY.BASE}${API_ENDPOINTS.PACKY.CONFIG}`,

  // 页面 URL
  PACKY_DASHBOARD: `${API_ENDPOINTS.PACKY.BASE}/dashboard`,
  PACKY_PRICING: `${API_ENDPOINTS.PACKY.BASE}/pricing`,

  STATUS_MONITOR: "https://packy-status.te.sb/status/api",
  USER_INFO: `${API_ENDPOINTS.PACKY.BASE}${API_ENDPOINTS.PACKY.USER_INFO}`
} as const

/**
 * API 响应类型定义
 */
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

/**
 * 统一的错误处理
 */
export function handleApiError(error: any, context: string): string {
  console.error(`[API Error - ${context}]:`, error)

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return `Unknown error in ${context}`
}
