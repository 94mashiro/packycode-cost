/**
 * 统一的HTTP请求工具
 * 包含重试、超时、错误处理等机制
 */

import { loggers } from "~/lib/logger"
import { type ApiResponse, HttpMethod } from "~/types"

const logger = loggers.api

interface RequestOptions {
  baseDelay?: number
  body?: string
  headers?: Record<string, string>
  maxRetries?: number
  method?: HttpMethod
  timeout?: number
}

/**
 * GET请求的便捷方法
 */
export async function get<T>(
  url: string,
  options: Omit<RequestOptions, "method"> = {}
): Promise<ApiResponse<T>> {
  return request<T>(url, { ...options, method: HttpMethod.GET })
}

/**
 * POST请求的便捷方法
 */
export async function post<T>(
  url: string,
  data?: unknown,
  options: Omit<RequestOptions, "body" | "method"> = {}
): Promise<ApiResponse<T>> {
  return request<T>(url, {
    ...options,
    body: data ? JSON.stringify(data) : undefined,
    method: HttpMethod.POST
  })
}

/**
 * 统一的HTTP请求函数
 * 自动处理重试、超时、错误恢复
 */
export async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    baseDelay = 1000,
    body,
    headers = { "Content-Type": "application/json" },
    maxRetries = 3,
    method = HttpMethod.GET,
    timeout = 10000
  } = options

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`${method} ${url} (attempt ${attempt}/${maxRetries})`)

      // 🔍 调试日志：JSON 格式显示实际发送的请求信息
      const requestInfo = {
        attempt,
        bodyLength: body?.length || 0,
        hasBody: !!body,
        headers: Object.entries(headers).map(([key, value]) => {
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
          return { key, value }
        }),
        maxRetries,
        method,
        url
      }
      logger.info("[REQUEST] 请求信息:", JSON.stringify(requestInfo, null, 2))

      const response = await fetch(url, {
        body,
        headers,
        method,
        signal: AbortSignal.timeout(timeout)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      logger.debug(`${method} ${url} succeeded`)

      // 🔍 调试日志：成功响应
      const successInfo = {
        method,
        status: response.status,
        statusText: response.statusText,
        success: true,
        url
      }
      logger.info("[REQUEST] 响应结果:", JSON.stringify(successInfo, null, 2))

      return {
        data,
        success: true
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      logger.error(`${method} ${url} attempt ${attempt} failed:`, errorMessage)

      // 🔍 调试日志：失败响应
      const errorInfo = {
        attempt,
        error: errorMessage,
        maxRetries,
        method,
        success: false,
        url
      }
      logger.error("[REQUEST] 错误信息:", JSON.stringify(errorInfo, null, 2))

      // 如果是最后一次尝试，返回失败
      if (attempt === maxRetries) {
        logger.error(`${method} ${url} all attempts failed`)
        return {
          error: errorMessage,
          success: false
        }
      }

      // 指数退避：1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1)
      logger.debug(`Retrying ${method} ${url} in ${delay}ms...`)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return {
    error: "Request failed after all retries",
    success: false
  }
}
