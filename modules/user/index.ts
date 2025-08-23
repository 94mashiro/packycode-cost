/**
 * 用户模块
 *
 * Dan: "用户数据是应用的核心，应该有清晰的 API"
 * Linus: "数据获取应该有明确的错误处理"
 */

export * from "./api"
export * from "./hooks" // 🆕 导出用户相关hooks
export type { Budget, UserInfo } from "~/types"

import type { UserInfo } from "~/types"

// 模块级别的状态管理
let cachedUserInfo: null | UserInfo = null

export function getCachedUserInfo(): null | UserInfo {
  return cachedUserInfo
}

export function setCachedUserInfo(info: null | UserInfo): void {
  cachedUserInfo = info
}
