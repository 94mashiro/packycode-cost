/**
 * 认证模块
 *
 * Linus: "认证是安全的基础，必须有清晰的接口"
 * Dan: "认证状态应该易于理解和使用"
 */

// 导出所有认证相关功能
export * from "./auth"
export * from "./jwt"

// 导出类型（从统一类型文件）
export type { AuthStorage, JWTPayload, TokenType } from "~/types"

// 模块级别的便捷函数
import { getStoredToken } from "./auth"
import { isTokenExpired, parseJWT } from "./jwt"

/**
 * 获取当前用户ID（如果已认证）
 */
export async function getCurrentUserId(): Promise<null | string> {
  const token = await getStoredToken()
  if (!token) return null

  try {
    const decoded = parseJWT(token)
    return decoded.sub || null
  } catch {
    return null
  }
}

/**
 * 检查当前认证状态
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getStoredToken()
  if (!token) return false

  try {
    const decoded = parseJWT(token)
    return !isTokenExpired(decoded)
  } catch {
    return false
  }
}
