import type {
  AccountRegistry,
  AuthStorage,
  NotificationStates,
  PackyConfig,
  PeerSpendingStorage,
  SubscriptionApiResponse,
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
 *
 * v3.0.0+ 多账号管理架构:
 * - 账号特定域: 格式为 account_{accountId}.{domain}
 * - 账号管理域: 全局共享的账号注册表和配置
 */
export enum StorageDomain {
  // === 全局账号管理域 (v3.0.0+) ===
  /** 账号注册表 - 所有账号的索引 */
  ACCOUNT_REGISTRY = "global.account.registry",
  // === 账号特定域（多账号架构） ===
  AUTH = "auth",
  NOTIFICATION_STATES = "notification.states",
  PEER_SPENDING = "peer.spending",
  PURCHASE_CONFIG = "purchase_config",
  SUBSCRIPTION_INFO = "subscription.info",
  SYSTEM_PREFERENCE = "system.preference",

  USER_INFO = "user.info",

  // === 全局用户偏好域 ===
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
 *
 * v3.0.0+ 新增:
 * - ACCOUNT_REGISTRY 映射到 AccountRegistry
 */
export interface StorageDomainMap {
  [StorageDomain.ACCOUNT_REGISTRY]: AccountRegistry
  [StorageDomain.AUTH]: AuthStorage
  [StorageDomain.NOTIFICATION_STATES]: NotificationStates
  [StorageDomain.PEER_SPENDING]: PeerSpendingStorage
  [StorageDomain.PURCHASE_CONFIG]: PackyConfig
  [StorageDomain.SUBSCRIPTION_INFO]: SubscriptionApiResponse
  [StorageDomain.SYSTEM_PREFERENCE]: SystemPreferenceStorage
  [StorageDomain.USER_INFO]: UserInfo
  [StorageDomain.USER_PREFERENCE]: UserPreferenceStorage
}

/**
 * 域名到 AccountData 字段的映射（v3.1.0+）
 *
 * 用于聚合存储模式下的字段访问
 */
export const DOMAIN_TO_FIELD_MAP: Record<
  string,
  keyof import("~/types").AccountData
> = {
  [StorageDomain.AUTH]: "auth",
  [StorageDomain.NOTIFICATION_STATES]: "notificationStates",
  [StorageDomain.PEER_SPENDING]: "peerSpending",
  [StorageDomain.PURCHASE_CONFIG]: "purchaseConfig",
  [StorageDomain.SUBSCRIPTION_INFO]: "subscriptionInfo",
  [StorageDomain.SYSTEM_PREFERENCE]: "systemPreference",
  [StorageDomain.USER_INFO]: "userInfo"
}
