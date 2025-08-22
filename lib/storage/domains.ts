import type {
  AuthStorage,
  PackyConfig,
  SystemPreferenceStorage,
  UserInfo,
  UserPreferenceStorage
} from "../../types"

/**
 * 存储域枚举 - 定义所有可用的存储域
 *
 * 设计原则:
 * - 版本化域: 会根据当前账号版本添加前缀 (shared./private.)
 * - 全局域: 以 global. 开头，在所有版本间共享
 */
export enum StorageDomain {
  // === 版本化域 ===
  AUTH = "auth",
  PURCHASE_CONFIG = "purchase_config",
  SYSTEM_PREFERENCE = "system.preference",
  USER_INFO = "user.info",

  // === 全局域 ===
  USER_PREFERENCE = "global.user.preference"
}

/**
 * 类型工具: 获取存储域对应的数据类型
 */
export type StorageDataType<T extends keyof StorageDomainMap> =
  StorageDomainMap[T]

/**
 * 存储域到数据类型的映射
 *
 * 这个映射实现了类型安全的自动推导:
 * - useVersionedStorage(StorageDomain.AUTH) 自动推导为 AuthStorage | null
 * - useVersionedStorage(StorageDomain.USER_INFO) 自动推导为 UserInfo | null
 */
export interface StorageDomainMap {
  [StorageDomain.AUTH]: AuthStorage
  [StorageDomain.PURCHASE_CONFIG]: PackyConfig
  [StorageDomain.SYSTEM_PREFERENCE]: SystemPreferenceStorage
  [StorageDomain.USER_INFO]: UserInfo
  [StorageDomain.USER_PREFERENCE]: UserPreferenceStorage
}
