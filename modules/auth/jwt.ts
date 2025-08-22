import type { JWTPayload } from "~/types"

export { type JWTPayload }

export function formatExpirationTime(exp: number): string {
  const expDate = new Date(exp * 1000) // Convert from seconds to milliseconds
  const now = new Date()

  if (expDate < now) {
    return "已过期"
  }

  const diff = expDate.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}天${hours}小时后`
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟后`
  } else {
    return `${minutes}分钟后`
  }
}

export function getTokenExpiration(token: null | string): {
  exp: null | number
  formatted: string
  isExpired: boolean
} {
  if (!token) {
    return {
      exp: null,
      formatted: "无有效token",
      isExpired: true
    }
  }

  const payload = parseJWT(token)
  if (!payload || !payload.exp) {
    return {
      exp: null,
      formatted: "无法解析过期时间",
      isExpired: true
    }
  }

  const now = Math.floor(Date.now() / 1000)
  const isExpired = payload.exp < now

  return {
    exp: payload.exp,
    formatted: formatExpirationTime(payload.exp),
    isExpired
  }
}

export function isTokenExpired(payload: JWTPayload | null): boolean {
  if (!payload || !payload.exp) {
    return true
  }

  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

export function parseJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      return null
    }

    const [, payload] = parts

    const paddedPayload = payload + "=".repeat((4 - (payload.length % 4)) % 4)

    const base64 = paddedPayload.replace(/-/g, "+").replace(/_/g, "/")

    const decoded = JSON.parse(atob(base64))

    return decoded as JWTPayload
  } catch {
    return null
  }
}
