/**
 * API 模块 - 统一管理所有 API 端点和请求
 * 不要再到处硬编码 URL 了！
 */

import { loggers } from "~/lib/logger"

import {
  type ApiResponse,
  type PackyConfig,
  TokenType,
  type UserApiResponse
} from "../types"
import { get } from "../utils/request"

const logger = loggers.api

/**
 * API 基础配置
 */
const API_ENDPOINTS = {
  PACKY: {
    // WebRequest 监听模式
    API_KEYS_PATTERN: "/api/backend/users/*/api-keys/*",
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
  async getConfig(): Promise<ApiResponse<PackyConfig>> {
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
    _tokenType: TokenType // 暂时保留参数签名兼容性，但不使用
  ): Promise<ApiResponse<UserApiResponse>> {
    // 目前只有一个端点，都用 Bearer token
    const url = `${API_ENDPOINTS.PACKY.BASE}${API_ENDPOINTS.PACKY.USER_INFO}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }

    return get<UserApiResponse>(url, { headers })
  }
}

/**
 * 导出 API 端点常量（用于需要直接访问的场景）
 */
export const API_URLS = {
  API_KEYS_PATTERN: `${API_ENDPOINTS.PACKY.BASE}${API_ENDPOINTS.PACKY.API_KEYS_PATTERN}`,

  // 其他服务 - 这些暂时硬编码，因为不属于主 API
  NETWORK_TEST: "https://packy.te.sb/",
  // 基础 URL
  PACKY_BASE: API_ENDPOINTS.PACKY.BASE,
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
export { type ApiResponse }

/**
 * 统一的错误处理
 */
export function handleApiError(error: unknown, context: string): string {
  logger.error(`Error - ${context}:`, error)

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return `Unknown error in ${context}`
}
