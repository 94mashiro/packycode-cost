/**
 * 动态API模块 - 基于账号类型适配的统一API接口
 *
 * Linus: "统一的接口比分散的配置更容易维护"
 * Dan: "API应该对账号类型的差异透明"
 */

import { loggers } from "~/lib/logger"
import { get } from "~/lib/request"
import {
  ApiEndpointType,
  type ApiResponse,
  type PackyConfig,
  PageUrlType,
  TokenType,
  type UserApiResponse
} from "~/types"

import { getCurrentApiUrl, getCurrentPageUrl } from "./config"

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
    const configUrl = await getCurrentApiUrl(ApiEndpointType.CONFIG)
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
    const userInfoUrl = await getCurrentApiUrl(ApiEndpointType.USER_INFO)

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
    return getCurrentApiUrl(ApiEndpointType.API_KEYS_PATTERN)
  },

  /**
   * 获取配置API URL
   */
  async getConfigUrl(): Promise<string> {
    return getCurrentApiUrl(ApiEndpointType.CONFIG)
  },

  /**
   * 获取仪表板页面URL
   */
  async getDashboardUrl(): Promise<string> {
    return getCurrentPageUrl(PageUrlType.DASHBOARD)
  },

  /**
   * 获取定价页面URL
   */
  async getPricingUrl(): Promise<string> {
    return getCurrentPageUrl(PageUrlType.PRICING)
  },

  /**
   * 获取用户信息API URL
   */
  async getUserInfoUrl(): Promise<string> {
    return getCurrentApiUrl(ApiEndpointType.USER_INFO)
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
