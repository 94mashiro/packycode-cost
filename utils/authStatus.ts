import { getTokenExpiration } from "~/modules/auth"
import { type AuthDomain, TokenType } from "~/types"

/**
 * 认证状态枚举
 *
 * 用于统一 popup 和 account-manager 的状态判断逻辑
 */
export enum AuthStatus {
  AUTHENTICATED = "authenticated",
  CHECKING = "checking",
  EXPIRED = "expired",
  INVALID = "invalid",
  NETWORK_ERROR = "network_error",
  NO_TOKEN = "no_token",
  RATE_LIMITED = "rate_limited"
}

/**
 * 认证状态结果
 *
 * 包含完整的认证信息，用于 UI 展示
 */
export interface AuthenticationResult {
  checkedAt?: number
  displayColor: string
  displayLabel: string
  httpStatus?: number
  isAuthenticated: boolean
  reason?: string
  status: AuthStatus
}

/**
 * 统一的认证状态判断函数
 *
 * 设计原则（四师协作）：
 * 🐧 Linus: "单一真实来源，避免逻辑分散"
 * ⚛️ Dan: "清晰的状态判断，优先级一目了然"
 * ☕ Bloch: "防御性编程，处理所有边界情况"
 * 🏛️ Fowler: "领域模型准确反映'token 能否调用 API'"
 *
 * 判断优先级（从高到低）：
 * 1. Token 不存在 → 未认证 (NO_TOKEN)
 * 2. JWT 实时过期检查 → 已过期 (EXPIRED) ⚠️ 优先级最高
 * 3. validation.status === "valid" → 已认证 (AUTHENTICATED)
 * 4. validation.status === "invalid" → 无效 (INVALID)
 * 5. validation.status === "expired" → 已过期 (EXPIRED)
 * 6. validation.status === "rate_limited" → 频率受限 (RATE_LIMITED)
 * 7. validation.status === "network_error" → 网络错误 (NETWORK_ERROR)
 * 8. validation.status === "unknown" → 检测中 (CHECKING)
 *
 * @param authData 认证领域数据
 * @returns 认证状态结果
 */
export function getAuthenticationStatus(
  authData: AuthDomain | null
): AuthenticationResult {
  // 1. Token 不存在
  if (!authData?.token || !authData?.tokenType) {
    return {
      displayColor: "bg-gray-400",
      displayLabel: "未认证",
      isAuthenticated: false,
      reason: "未找到有效的认证令牌",
      status: AuthStatus.NO_TOKEN
    }
  }

  // 2. JWT 实时过期检查（优先级最高）
  if (authData.tokenType === TokenType.JWT) {
    const expiration = getTokenExpiration(authData.token)
    if (expiration.isExpired) {
      return {
        checkedAt: Date.now(),
        displayColor: "bg-red-500",
        displayLabel: "已过期",
        isAuthenticated: false,
        reason: `JWT Token 已过期（${expiration.formatted}）`,
        status: AuthStatus.EXPIRED
      }
    }
  }

  // 3. 根据 validation.status 判断（服务器验证结果）
  const validationStatus = authData.validation?.status

  switch (validationStatus) {
    case "valid":
      return {
        checkedAt: authData.validation?.checkedAt,
        displayColor: "bg-green-500",
        displayLabel: "有效",
        httpStatus: authData.validation?.httpStatus,
        isAuthenticated: true,
        reason: authData.validation?.reason,
        status: AuthStatus.AUTHENTICATED
      }

    case "invalid":
      return {
        checkedAt: authData.validation?.checkedAt,
        displayColor: "bg-red-500",
        displayLabel: "无效",
        httpStatus: authData.validation?.httpStatus,
        isAuthenticated: false,
        reason:
          authData.validation?.reason || "Token 验证失败，可能已被撤销或无效",
        status: AuthStatus.INVALID
      }

    case "expired":
      return {
        checkedAt: authData.validation?.checkedAt,
        displayColor: "bg-red-500",
        displayLabel: "已过期",
        httpStatus: authData.validation?.httpStatus,
        isAuthenticated: false,
        reason: authData.validation?.reason || "Token 已过期，请重新登录",
        status: AuthStatus.EXPIRED
      }

    case "rate_limited":
      return {
        checkedAt: authData.validation?.checkedAt,
        displayColor: "bg-yellow-500",
        displayLabel: "频率受限",
        httpStatus: authData.validation?.httpStatus,
        isAuthenticated: false,
        reason: authData.validation?.reason || "请求频率受限，请稍后重试",
        status: AuthStatus.RATE_LIMITED
      }

    case "network_error":
      return {
        checkedAt: authData.validation?.checkedAt,
        displayColor: "bg-yellow-500",
        displayLabel: "网络错误",
        httpStatus: authData.validation?.httpStatus,
        isAuthenticated: false,
        reason:
          authData.validation?.reason ||
          "网络通信失败，请检查网络连接或 API 服务状态",
        status: AuthStatus.NETWORK_ERROR
      }

    case "unknown":
    default:
      return {
        checkedAt: authData.validation?.checkedAt,
        displayColor: "bg-gray-400",
        displayLabel: "检测中",
        isAuthenticated: false,
        reason: "正在验证 Token 有效性...",
        status: AuthStatus.CHECKING
      }
  }
}
