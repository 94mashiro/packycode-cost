/**
 * PackyCode URL配置管理
 *
 * 职责: 动态URL获取和页面导航支持
 * 注意: API数据请求请使用 ~/lib/api/PackyCodeApiClient
 */

import { ApiEndpointType, PageUrlType } from "~/types"

import { getCurrentApiUrl, getCurrentPageUrl } from "./config"

/**
 * 动态API URL获取器
 * 基于当前账号类型提供所有相关URL
 */
export const dynamicApiUrls = {
  /**
   * 获取API Keys监听模式URL
   */
  async getApiKeysPattern(): Promise<string> {
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
   * 获取订阅信息API URL
   */
  async getSubscriptionsUrl(): Promise<string> {
    return getCurrentApiUrl(ApiEndpointType.SUBSCRIPTIONS)
  },

  /**
   * 获取用户信息API URL
   */
  async getUserInfoUrl(): Promise<string> {
    return getCurrentApiUrl(ApiEndpointType.USER_INFO)
  }
}

/**
 * 重新导出配置管理函数，方便其他模块使用
 */
export { getCurrentApiUrl, getCurrentPageUrl } from "./config"
