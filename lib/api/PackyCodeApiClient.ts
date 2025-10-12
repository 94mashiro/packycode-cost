/**
 * 统一的PackyCode API客户端
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "一个清晰的API接口胜过三个混乱的接口"
 * ⚛️ Dan: "开发者应该只需要记住一种API使用方式"
 * ☕ Bloch: "API设计要么全部一致，要么不要做"
 * 🏛️ Fowler: "合并重复的抽象层，保持架构清晰"
 */

import { getCurrentApiUrl } from "~/api/config"
import { get } from "~/lib/request"
import { httpClient } from "~/lib/request/AuthenticatedClient"
import {
  ApiEndpointType,
  type PackyConfig,
  type SharedSpaceApiResponse,
  type SubscriptionApiResponse,
  type UserApiResponse
} from "~/types"

/**
 * 统一的PackyCode API客户端
 * 集成了URL适配、认证管理、错误处理的完整解决方案
 *
 * 架构改进:
 * - 接收 AccountContext 而非单独的 authData
 * - 从 context.site 生成目标站点 URL，确保站点和 token 匹配
 * - 消除对 getCurrentApiUrl() 的依赖
 */
export class PackyCodeApiClient {
  /**
   * 通用GET请求方法
   * 适用于其他需要认证的API端点
   * @param context 账号执行上下文（包含站点、认证等完整信息）
   */
  async get<T>(
    endpoint: ApiEndpointType,
    context: import("~/types").AccountContext
  ): Promise<T> {
    const url = this.getApiUrlForSite(endpoint, context.site)
    return httpClient.get<T>(url, {}, context.authData)
  }

  /**
   * 获取购买配置信息
   * 不需要认证，使用匿名访问
   */
  async getConfig(): Promise<PackyConfig> {
    const configUrl = await getCurrentApiUrl(ApiEndpointType.CONFIG)
    const response = await get<PackyConfig>(configUrl)

    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch config")
    }

    return response.data
  }

  /**
   * 获取共享空间信息
   * 自动处理认证和URL适配
   * @param context 账号执行上下文
   */
  async getSharedSpace(
    context: import("~/types").AccountContext
  ): Promise<SharedSpaceApiResponse> {
    const sharedSpaceUrl = this.getApiUrlForSite(
      ApiEndpointType.SHARED_SPACE,
      context.site
    )
    return httpClient.get<SharedSpaceApiResponse>(
      sharedSpaceUrl,
      {},
      context.authData
    )
  }

  /**
   * 获取用户订阅信息
   * 自动处理认证和URL适配
   * @param context 账号执行上下文
   */
  async getSubscriptions(
    context: import("~/types").AccountContext
  ): Promise<SubscriptionApiResponse> {
    const subscriptionsUrl = this.getApiUrlForSite(
      ApiEndpointType.SUBSCRIPTIONS,
      context.site
    )
    return httpClient.get<SubscriptionApiResponse>(
      subscriptionsUrl,
      {},
      context.authData
    )
  }

  /**
   * 获取用户信息（预算、使用量等）
   * 自动处理认证和URL适配
   * @param context 账号执行上下文
   */
  async getUserInfo(
    context: import("~/types").AccountContext
  ): Promise<UserApiResponse> {
    const userInfoUrl = this.getApiUrlForSite(
      ApiEndpointType.USER_INFO,
      context.site
    )
    return httpClient.get<UserApiResponse>(userInfoUrl, {}, context.authData)
  }

  /**
   * 通用POST请求方法
   * 适用于需要发送数据的API端点
   * @param context 账号执行上下文
   */
  async post<T>(
    endpoint: ApiEndpointType,
    data?: unknown,
    context?: import("~/types").AccountContext
  ): Promise<T> {
    if (!context) {
      throw new Error("AccountContext is required for POST requests")
    }
    const url = this.getApiUrlForSite(endpoint, context.site)
    return httpClient.post<T>(url, data, {}, context.authData)
  }

  /**
   * 根据站点生成 API URL (私有方法)
   *
   * 核心改进:
   * - 直接使用传入的站点，而非查询当前账号
   * - 确保 URL 和 token 的站点匹配
   *
   * @param endpoint API端点类型
   * @param site 目标站点
   * @returns 完整的 API URL
   */
  private getApiUrlForSite(
    endpoint: ApiEndpointType,
    site: import("~/types/account").PackySite
  ): string {
    const { ApiConfigManager } = require("~/api/config")
    const configManager = new ApiConfigManager(site)
    return configManager.getApiUrl(endpoint)
  }
}

/**
 * 单例API客户端实例
 * 整个应用使用同一个客户端实例
 */
export const packyCodeApi = new PackyCodeApiClient()

/**
 * 便捷的函数式API
 * 提供函数式调用方式，方便现有代码迁移
 *
 * 所有方法改为接收 AccountContext
 */
export const api = {
  /**
   * 通用请求方法
   */
  get: <T>(
    endpoint: ApiEndpointType,
    context: import("~/types").AccountContext
  ) => packyCodeApi.get<T>(endpoint, context),

  /**
   * 获取配置信息
   */
  getConfig: () => packyCodeApi.getConfig(),

  /**
   * 获取共享空间信息
   */
  getSharedSpace: (context: import("~/types").AccountContext) =>
    packyCodeApi.getSharedSpace(context),

  /**
   * 获取用户订阅信息
   */
  getSubscriptions: (context: import("~/types").AccountContext) =>
    packyCodeApi.getSubscriptions(context),

  /**
   * 获取用户信息
   */
  getUserInfo: (context: import("~/types").AccountContext) =>
    packyCodeApi.getUserInfo(context),

  post: <T>(
    endpoint: ApiEndpointType,
    data?: unknown,
    context?: import("~/types").AccountContext
  ) => packyCodeApi.post<T>(endpoint, data, context)
}

/**
 * 导出类型定义供其他模块使用
 */
export type {
  PackyConfig,
  SharedSpaceApiResponse,
  SubscriptionApiResponse,
  UserApiResponse
}
