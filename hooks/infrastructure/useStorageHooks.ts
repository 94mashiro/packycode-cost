import { StorageDomain } from "~/lib/storage/domains"

import { useStorage } from "./useStorage"

/**
 * 业务专用存储 Hooks
 *
 * 这些 hooks 提供最简洁的使用体验:
 * 1. 零配置 - 无需传入存储域参数
 * 2. 类型安全 - 自动推导正确的数据类型
 * 3. 语义清晰 - 函数名直接表达业务意图
 * 4. 一致性 - 统一的返回格式和错误处理
 */

/**
 * 认证数据 Hook
 *
 * 管理当前版本的认证信息 (JWT token 或 API key)
 * 自动推导类型: AuthStorage | null
 */
export const useAuth = () => useStorage(StorageDomain.AUTH)

/**
 * 用户信息 Hook
 *
 * 管理当前版本的用户预算和使用量信息
 * 自动推导类型: UserInfoStorage | null
 */
export const useUserInfo = () => useStorage(StorageDomain.USER_INFO)

/**
 * 购买配置 Hook
 *
 * 管理当前版本的购买状态和配置信息
 * 自动推导类型: PackyConfig | null
 */
export const usePurchaseConfig = () => useStorage(StorageDomain.PURCHASE_CONFIG)

/**
 * 系统偏好 Hook
 *
 * 管理当前版本的系统级配置 (API端点、购买状态等)
 * 自动推导类型: SystemPreferenceStorage | null
 */
export const useSystemPreference = () =>
  useStorage(StorageDomain.SYSTEM_PREFERENCE)

/**
 * 订阅信息 Hook
 *
 * 管理当前版本的用户订阅信息
 * 自动推导类型: SubscriptionApiResponse | null
 */
export const useSubscriptionInfo = () =>
  useStorage(StorageDomain.SUBSCRIPTION_INFO)

/**
 * 用户偏好 Hook
 *
 * 管理全局用户偏好设置 (版本选择、主题等)
 * 注意: 这是全局数据，在所有版本间共享
 * 自动推导类型: UserPreferenceStorage | null
 */
export const useUserPreference = () => useStorage(StorageDomain.USER_PREFERENCE)

/**
 * 同行消费数据 Hook
 *
 * 管理滴滴车模式下的同行消费数据
 * 注意: 仅在滴滴车模式下有数据
 * 自动推导类型: PeerSpendingStorage | null
 */
export const usePeerSpendingStorage = () =>
  useStorage(StorageDomain.PEER_SPENDING)

/**
 * 导出通用的 Hook 以备灵活使用
 *
 * 如果业务 hooks 不够用，可以直接使用通用版本:
 * const { data } = useStorage(StorageDomain.CUSTOM_DOMAIN)
 */
export { useStorage }
