/**
 * PackyCode URL配置管理
 *
 * 职责: 提供显式参数版本的API配置访问
 * 注意: API数据请求请使用 ~/lib/api/PackyCodeApiClient
 *
 * 架构原则：所有函数必须明确要求站点参数，不隐式查询当前账号
 */

import { ApiEndpointType, PageUrlType } from "~/types"
import { PackySite } from "~/types/account"

import { getApiUrl, getPageUrl } from "./config"

/**
 * 显式参数版本的API URL获取器
 * 所有函数都要求明确传递站点参数
 */
export const apiUrls = {
  /**
   * 获取指定站点的API Keys监听模式URL
   */
  getApiKeysPattern(site: PackySite): string {
    return getApiUrl(site, ApiEndpointType.API_KEYS_PATTERN)
  },

  /**
   * 获取指定站点的配置API URL
   */
  getConfigUrl(site: PackySite): string {
    return getApiUrl(site, ApiEndpointType.CONFIG)
  },

  /**
   * 获取指定站点的仪表板页面URL
   */
  getDashboardUrl(site: PackySite): string {
    return getPageUrl(site, PageUrlType.DASHBOARD)
  },

  /**
   * 获取指定站点的定价页面URL
   */
  getPricingUrl(site: PackySite): string {
    return getPageUrl(site, PageUrlType.PRICING)
  },

  /**
   * 获取指定站点的订阅信息API URL
   */
  getSubscriptionsUrl(site: PackySite): string {
    return getApiUrl(site, ApiEndpointType.SUBSCRIPTIONS)
  },

  /**
   * 获取指定站点的用户信息API URL
   */
  getUserInfoUrl(site: PackySite): string {
    return getApiUrl(site, ApiEndpointType.USER_INFO)
  }
}

/**
 * 重新导出配置管理函数，供其他模块使用
 */
export { apiUrls }
