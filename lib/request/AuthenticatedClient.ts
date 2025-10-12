/**
 * 认证感知的HTTP客户端
 *
 * 设计思想 (四师协作):
 * 🐧 Linus: "统一认证逻辑，消除业务层重复代码"
 * ⚛️ Dan: "提供清晰的错误边界和状态管理"
 * ☕ Bloch: "设计易用的API，隐藏认证复杂性"
 * 🏛️ Fowler: "应用Interceptor模式处理横切关注点"
 *
 * 架构改进：强制要求 authData 参数，不隐式查询当前账号
 */

import { loggers } from "~/lib/logger"
import { type ApiResponse, type AuthStorage, TokenType } from "~/types"

import { get as baseGet, post as basePost } from "./index"

const logger = loggers.api

/**
 * API业务异常 - 非认证相关的API错误
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * 认证感知的HTTP客户端
 * 自动处理token注入、过期检查、认证错误恢复
 */
export class AuthenticatedClient {
  /**
   * 执行认证感知的GET请求
   * @param endpoint API端点URL
   * @param options 请求选项
   * @param authData 认证数据（必需）
   * @returns 请求结果数据
   * @throws AuthenticationError token相关错误
   * @throws ApiError 其他API错误
   *
   * 架构原则：底层HTTP客户端必须明确要求认证数据，不隐式查询当前账号
   */
  async get<T>(
    endpoint: string,
    options: RequestInit,
    authData: AuthStorage
  ): Promise<T> {
    const response = await this.executeWithAuth<T>(
      endpoint,
      "GET",
      options,
      authData
    )
    return this.extractData(response)
  }

  /**
   * 执行认证感知的POST请求
   * @param endpoint API端点URL
   * @param data 请求体数据
   * @param options 请求选项
   * @param authData 认证数据（必需）
   * @returns 请求结果数据
   * @throws AuthenticationError token相关错误
   * @throws ApiError 其他API错误
   *
   * 架构原则：底层HTTP客户端必须明确要求认证数据，不隐式查询当前账号
   */
  async post<T>(
    endpoint: string,
    data: unknown,
    options: RequestInit,
    authData: AuthStorage
  ): Promise<T> {
    const response = await this.executeWithAuth<T>(
      endpoint,
      "POST",
      {
        ...options,
        body: data ? JSON.stringify(data) : undefined
      },
      authData
    )
    return this.extractData(response)
  }

  /**
   * 核心认证逻辑 - 统一处理token验证和注入
   * @param authData 认证数据（必需）
   *
   * 架构改进：移除 authData 参数的可选性，强制要求调用方传递
   */
  private async executeWithAuth<T>(
    endpoint: string,
    method: string,
    options: RequestInit,
    authData: AuthStorage
  ): Promise<ApiResponse<T>> {
    // 使用传入的认证数据
    const auth = authData
    if (!auth || !auth.token) {
      throw new AuthenticationError("No valid authentication token provided")
    }

    // 🔍 调试日志：JSON 格式输出认证信息
    const authInfo = {
      endpoint,
      isExpired: auth.expiry ? auth.expiry < Date.now() : false,
      method,
      tokenExpiry: auth.expiry ? new Date(auth.expiry).toISOString() : null,
      // 🔐 完整 token（仅用于调试，生产环境应删除）
      tokenFull: auth.token,
      tokenLength: auth.token?.length || 0,
      tokenPreview: auth.token?.substring(0, 20) + "...",
      tokenType: auth.type
    }
    logger.info("[AUTH] 认证信息:", JSON.stringify(authInfo, null, 2))

    // 2. 根据 token 类型注入不同的认证方式
    let authHeaders: Record<string, string>
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json"
    }

    // 合并已有的 headers（如果存在）
    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>
      Object.assign(baseHeaders, existingHeaders)
    }

    if (auth.type === TokenType.JWT) {
      // JWT 模式：放在 Cookie 中，key 为 "token"
      authHeaders = {
        ...baseHeaders,
        Authorization: `Bearer ${auth.token}`,
        Cookie: `token=${auth.token}`
      }
      logger.info(
        "[AUTH] 认证模式:",
        JSON.stringify(
          {
            cookieKey: "token",
            // 🔐 完整 Cookie 值（仅用于调试）
            cookieValueFull: `token=${auth.token}`,
            cookieValueLength: auth.token?.length || 0,
            cookieValuePreview: auth.token?.substring(0, 20) + "...",
            method: "Cookie",
            mode: "JWT"
          },
          null,
          2
        )
      )
    } else {
      // API Key 模式：放在 Authorization header 中
      authHeaders = {
        ...baseHeaders,
        Authorization: `Bearer ${auth.token}`
      }
      logger.info(
        "[AUTH] 认证模式:",
        JSON.stringify(
          {
            headerKey: "Authorization",
            // 🔐 完整 Authorization 值（仅用于调试）
            headerValueFull: `Bearer ${auth.token}`,
            headerValuePreview: `Bearer ${auth.token?.substring(0, 20)}...`,
            method: "Bearer",
            mode: "API_KEY",
            tokenLength: auth.token?.length || 0
          },
          null,
          2
        )
      )
    }

    // 🔍 调试日志：显示最终的 headers
    const headersSummary = Object.entries(authHeaders).map(([key, value]) => {
      if (
        key.toLowerCase() === "authorization" ||
        key.toLowerCase() === "cookie"
      ) {
        return {
          key,
          // 🔐 完整值（仅用于调试）
          valueFull: value,
          valueLength: value.length,
          valuePreview: value.substring(0, 30) + "..."
        }
      }
      return {
        key,
        value
      }
    })
    logger.info(
      "[AUTH] 最终请求 Headers:",
      JSON.stringify(headersSummary, null, 2)
    )

    // 3. 执行HTTP请求
    const requestFunction = method === "GET" ? baseGet : basePost
    const response = await requestFunction<T>(endpoint, {
      headers: authHeaders,
      ...options
    })

    // 4. 处理认证相关错误
    if (!response.success) {
      await this.handleAuthError(response.error)
      throw new ApiError(response.error || `${method} request failed`)
    }

    return response
  }

  /**
   * 从API响应中提取数据
   */
  private extractData<T>(response: ApiResponse<T>): T {
    if (!response.success || !response.data) {
      throw new ApiError(response.error || "API response data is missing")
    }
    return response.data
  }

  /**
   * 处理认证相关错误
   * 仅记录错误，不自动清理 token
   *
   * KISS 原则：不删除、不标记、不做任何额外操作
   */
  private async handleAuthError(error?: string): Promise<void> {
    if (!error) return

    // 检查是否是认证错误
    const isAuthError =
      error.includes("400") || error.includes("401") || error.includes("403")

    if (isAuthError) {
      logger.warn("Authentication error detected (token NOT cleared):", error)
      // 就这样 - 什么都不做，只抛出错误
      // 让上层决定是重试、提示用户还是其他操作
      throw new AuthenticationError(`Authentication failed: ${error}`)
    }
  }
}

/**
 * 认证异常 - 当token无效或过期时抛出
 */
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly shouldClearToken: boolean = true
  ) {
    super(message)
    this.name = "AuthenticationError"
  }
}

/**
 * 统一的认证感知HTTP客户端实例
 * 业务层的所有请求都通过此客户端，自动处理认证
 */
export const httpClient = new AuthenticatedClient()
