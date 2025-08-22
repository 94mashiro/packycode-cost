/**
 * Storage 键名常量定义
 * 使用领域驱动设计，将存储字段按领域分组
 */

export const STORAGE_KEYS = {
  // 认证领域
  AUTH: "auth",

  // 购买配置（保留原有结构）
  PURCHASE_CONFIG: "purchase_config",
  // 系统领域
  SYSTEM_PREFERENCE: "system.preference",

  // 用户领域
  USER_INFO: "user.info",

  USER_PREFERENCE: "user.preference"
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
