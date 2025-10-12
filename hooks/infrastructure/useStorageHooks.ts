import { StorageDomain } from "~/lib/storage/domains"

import { useStorage } from "./useStorage"

/**
 * 业务专用存储 Hooks
 *
 * 领域驱动设计：每个 hook 对应一个领域
 * 1. 零配置 - 无需传入存储域参数
 * 2. 类型安全 - 自动推导正确的领域类型
 * 3. 语义清晰 - 函数名直接表达领域概念
 * 4. 一致性 - 统一的返回格式和错误处理
 */

/**
 * 认证数据 Hook
 * 自动推导类型: AuthDomain | null
 */
export const useAuth = () => useStorage(StorageDomain.AUTH)

/**
 * 财务数据 Hook
 * 管理预算和余额数据
 * 自动推导类型: FinanceDomain | null
 */
export const useFinance = () => useStorage(StorageDomain.FINANCE)

/**
 * 能力状态 Hook
 * 管理 Opus、购买状态等系统能力
 * 自动推导类型: CapabilitiesDomain | null
 */
export const useCapabilities = () => useStorage(StorageDomain.CAPABILITIES)

/**
 * 订阅信息 Hook
 * 自动推导类型: SubscriptionDomain | null
 */
export const useSubscription = () => useStorage(StorageDomain.SUBSCRIPTION)

/**
 * 协作数据 Hook
 * 管理团队消费统计数据
 * 自动推导类型: CollaborationDomain | null
 */
export const useCollaboration = () => useStorage(StorageDomain.COLLABORATION)

/**
 * 用户偏好 Hook
 * 管理全局用户偏好设置
 * 注意: 这是全局数据，在所有账号间共享
 * 自动推导类型: UserPreferenceStorage | null
 */
export const useUserPreference = () => useStorage(StorageDomain.USER_PREFERENCE)

/**
 * 导出通用的 Hook 以备灵活使用
 */
export { useStorage }
