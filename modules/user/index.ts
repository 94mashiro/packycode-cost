/**
 * 用户模块
 *
 * Dan: "用户数据是应用的核心，应该有清晰的 API"
 * Linus: "数据获取应该有明确的错误处理"
 *
 * 架构清理：移除模块级缓存
 * - 所有数据从 Chrome Storage 读取
 * - 无全局变量，避免内存泄漏
 */

export * from "./api"
export * from "./hooks" // 🆕 导出用户相关hooks
export type { Budget, UserInfo } from "~/types"
