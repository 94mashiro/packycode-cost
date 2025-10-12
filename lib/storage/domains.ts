import type {
  AccountRegistry,
  AuthDomain,
  CapabilitiesDomain,
  CollaborationDomain,
  FinanceDomain,
  SubscriptionDomain,
  UserPreferenceStorage
} from "../../types"

/**
 * 存储域枚举 - 领域驱动设计
 *
 * 设计原则:
 * 1. 枚举名称直接对应 AccountData 的5大领域
 * 2. 1:1 映射关系，清晰直观
 * 3. 移除所有废弃和冗余的枚举值
 * 4. 命名统一：小写点号分隔
 *
 * 多账号管理架构:
 * - 账号特定域: 存储在 account_{accountId}_info 聚合键中
 * - 全局域: 以 global. 开头，在所有账号间共享
 */
export enum StorageDomain {
  // === 全局域（跨账号共享） ===
  ACCOUNT_REGISTRY = "global.account.registry",
  // === 账号领域（5大核心领域，与 AccountData 完美对应） ===
  AUTH = "auth",

  CAPABILITIES = "capabilities",
  COLLABORATION = "collaboration",
  FINANCE = "finance",
  SUBSCRIPTION = "subscription",
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
 * 领域驱动设计：每个枚举值直接映射到对应的领域类型
 * - StorageDomain.AUTH → AuthDomain
 * - StorageDomain.FINANCE → FinanceDomain
 * - StorageDomain.CAPABILITIES → CapabilitiesDomain
 * - StorageDomain.SUBSCRIPTION → SubscriptionDomain
 * - StorageDomain.COLLABORATION → CollaborationDomain
 */
export interface StorageDomainMap {
  [StorageDomain.ACCOUNT_REGISTRY]: AccountRegistry
  [StorageDomain.AUTH]: AuthDomain
  [StorageDomain.CAPABILITIES]: CapabilitiesDomain
  [StorageDomain.COLLABORATION]: CollaborationDomain
  [StorageDomain.FINANCE]: FinanceDomain
  [StorageDomain.SUBSCRIPTION]: SubscriptionDomain
  [StorageDomain.USER_PREFERENCE]: UserPreferenceStorage
}

/**
 * 域名到 AccountData 字段的映射
 *
 * 领域驱动设计：完美的 1:1 映射
 * 枚举名称直接对应 AccountData 字段名
 */
export const DOMAIN_TO_FIELD_MAP: Record<
  string,
  keyof import("~/types").AccountData
> = {
  [StorageDomain.AUTH]: "auth",
  [StorageDomain.CAPABILITIES]: "capabilities",
  [StorageDomain.COLLABORATION]: "collaboration",
  [StorageDomain.FINANCE]: "finance",
  [StorageDomain.SUBSCRIPTION]: "subscription"
}
