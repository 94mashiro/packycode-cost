/**
 * 动态API模块 - 基于账号类型适配的统一API接口
 *
 * Linus: "统一的接口比分散的配置更容易维护"
 * Dan: "API应该对账号类型的差异透明"
 */

import { loggers } from "~/lib/logger"
import { get } from "~/lib/request"
import { getCurrentApiUrl, getCurrentPageUrl } from "~/modules/auth"
import {
  type ApiResponse,
  type PackyConfig,
  TokenType,
  type UserApiResponse
} from "~/types"

const logger = loggers.api

/**
 * 动态PackyCode API - 基于当前账号类型
 */
export const dynamicPackyApi = {
  /**
   * 获取购买配置
   * 自动使用当前账号类型的配置端点
   */
  async getConfig(): Promise<ApiResponse<PackyConfig>> {
    const configUrl = await getCurrentApiUrl("config")
    return get<PackyConfig>(configUrl)
  }
}

/**
 * 动态用户API - 基于当前账号类型
 */
export const dynamicUserApi = {
  /**
   * 获取用户信息（预算、使用量等）
   * 自动使用当前账号类型的用户信息端点
   * @param token 认证令牌
   * @param _tokenType 令牌类型（保留兼容性）
   */
  async getUserInfo(
    token: string,
    _tokenType: TokenType
  ): Promise<ApiResponse<UserApiResponse>> {
    const userInfoUrl = await getCurrentApiUrl("userInfo")

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }

    return get<UserApiResponse>(userInfoUrl, { headers })
  }
}

/**
 * 动态API URL获取器
 * 基于当前账号类型提供所有相关URL
 */
export const dynamicApiUrls = {
  /**
   * 获取API Keys监听模式URL
   */
  async getApiKeysPattern(): Promise<string> {
    // 直接返回完整的API Keys Pattern URL
    return getCurrentApiUrl("apiKeysPattern")
  },

  /**
   * 获取配置API URL
   */
  async getConfigUrl(): Promise<string> {
    return getCurrentApiUrl("config")
  },

  /**
   * 获取仪表板页面URL
   */
  async getDashboardUrl(): Promise<string> {
    return getCurrentPageUrl("dashboard")
  },

  /**
   * 获取定价页面URL
   */
  async getPricingUrl(): Promise<string> {
    return getCurrentPageUrl("pricing")
  },

  /**
   * 获取用户信息API URL
   */
  async getUserInfoUrl(): Promise<string> {
    return getCurrentApiUrl("userInfo")
  }
}

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

/**
 * API 响应类型定义
 */
export { type ApiResponse }
