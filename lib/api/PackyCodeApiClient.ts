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
  type SubscriptionApiResponse,
  type UserApiResponse
} from "~/types"

/**
 * 统一的PackyCode API客户端
 * 集成了URL适配、认证管理、错误处理的完整解决方案
 */
export class PackyCodeApiClient {
  /**
   * 通用GET请求方法
   * 适用于其他需要认证的API端点
   */
  async get<T>(endpoint: ApiEndpointType): Promise<T> {
    const url = await getCurrentApiUrl(endpoint)
    return httpClient.get<T>(url)
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
   * 获取用户订阅信息
   * 自动处理认证和URL适配
   */
  async getSubscriptions(): Promise<SubscriptionApiResponse> {
    const subscriptionsUrl = await getCurrentApiUrl(
      ApiEndpointType.SUBSCRIPTIONS
    )
    return httpClient.get<SubscriptionApiResponse>(subscriptionsUrl)
  }

  /**
   * 获取用户信息（预算、使用量等）
   * 自动处理认证和URL适配
   */
  async getUserInfo(): Promise<UserApiResponse> {
    const userInfoUrl = await getCurrentApiUrl(ApiEndpointType.USER_INFO)
    return httpClient.get<UserApiResponse>(userInfoUrl)
  }

  /**
   * 通用POST请求方法
   * 适用于需要发送数据的API端点
   */
  async post<T>(endpoint: ApiEndpointType, data?: unknown): Promise<T> {
    const url = await getCurrentApiUrl(endpoint)
    return httpClient.post<T>(url, data)
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
 */
export const api = {
  /**
   * 通用请求方法
   */
  get: <T>(endpoint: ApiEndpointType) => packyCodeApi.get<T>(endpoint),

  /**
   * 获取配置信息
   */
  getConfig: () => packyCodeApi.getConfig(),

  /**
   * 获取用户订阅信息
   */
  getSubscriptions: () => packyCodeApi.getSubscriptions(),

  /**
   * 获取用户信息
   */
  getUserInfo: () => packyCodeApi.getUserInfo(),
  post: <T>(endpoint: ApiEndpointType, data?: unknown) =>
    packyCodeApi.post<T>(endpoint, data)
}

/**
 * 导出类型定义供其他模块使用
 */
export type { PackyConfig, SubscriptionApiResponse, UserApiResponse }
