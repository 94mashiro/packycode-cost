import { useSubscriptionInfo } from "~/hooks"

import { convertSubscriptionToPackageInfo, type PackageInfo } from "../mapper"

/**
 * 订阅显示 Hook
 *
 * Dan Abramov 设计理念：
 * - 封装复杂的状态逻辑，提供简单的 API
 * - 单一职责：只处理订阅显示相关的状态管理
 * - 可测试：纯 Hook，易于独立测试
 */

export interface UseSubscriptionDisplayReturn {
  /** 错误信息 */
  error: null | string
  /** 是否正在加载 */
  loading: boolean
  /** 转换后的套餐信息 */
  packageInfo: null | PackageInfo
}

/**
 * 订阅显示状态管理 Hook
 *
 * 封装所有订阅显示相关的逻辑：
 * 1. 数据获取状态管理
 * 2. 数据转换
 * 3. 错误处理
 */
export function useSubscriptionDisplay(): UseSubscriptionDisplayReturn {
  const { data: subscriptionData, error, loading } = useSubscriptionInfo()

  // 数据转换
  const packageInfo = subscriptionData
    ? convertSubscriptionToPackageInfo(subscriptionData)
    : null

  return {
    error,
    loading,
    packageInfo
  }
}
