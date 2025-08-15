/**
 * 统一的HTTP请求工具
 * 包含重试、超时、错误处理等机制
 */

interface RequestOptions {
  baseDelay?: number
  body?: string
  headers?: Record<string, string>
  maxRetries?: number
  method?: string
  timeout?: number
}

interface RequestResult<T> {
  data?: T
  error?: string
  success: boolean
}

/**
 * GET请求的便捷方法
 */
export async function get<T>(
  url: string,
  options: Omit<RequestOptions, "method"> = {}
): Promise<RequestResult<T>> {
  return request<T>(url, { ...options, method: "GET" })
}

/**
 * POST请求的便捷方法
 */
export async function post<T>(
  url: string,
  data?: any,
  options: Omit<RequestOptions, "body" | "method"> = {}
): Promise<RequestResult<T>> {
  return request<T>(url, {
    ...options,
    body: data ? JSON.stringify(data) : undefined,
    method: "POST"
  })
}

/**
 * 统一的HTTP请求函数
 * 自动处理重试、超时、错误恢复
 */
export async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<RequestResult<T>> {
  const {
    baseDelay = 1000,
    body,
    headers = { "Content-Type": "application/json" },
    maxRetries = 3,
    method = "GET",
    timeout = 10000
  } = options

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[REQUEST] ${method} ${url} (attempt ${attempt}/${maxRetries})`
      )

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
      console.log(`[REQUEST] ${method} ${url} succeeded`)

      return {
        data,
        success: true
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error(
        `[REQUEST] ${method} ${url} attempt ${attempt} failed:`,
        errorMessage
      )

      // 如果是最后一次尝试，返回失败
      if (attempt === maxRetries) {
        console.error(`[REQUEST] ${method} ${url} all attempts failed`)
        return {
          error: errorMessage,
          success: false
        }
      }

      // 指数退避：1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`[REQUEST] Retrying ${method} ${url} in ${delay}ms...`)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return {
    error: "Request failed after all retries",
    success: false
  }
}
