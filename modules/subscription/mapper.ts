import { type SubscriptionApiResponse } from "~/types"

/**
 * 订阅数据映射器 - 四师简化版
 *
 * Linus: 直接明了，一个函数解决问题
 * Dan: 抽象应该解决实际问题，而不是创造问题
 * Bloch: 最好的API是用户根本感觉不到API的存在
 * Fowler: 代码应该表达业务意图，而不是炫耀技术功底
 */

/**
 * 套餐信息结构
 */
export interface PackageInfo {
  /** 结束时间 */
  endDate: Date
  /** 是否已过期 */
  isExpired: boolean
  /** 套餐类型名称 */
  packageType: string
  /** 开始时间 */
  startDate: Date
}

/**
 * 订阅数据到套餐信息的转换
 *
 * 简化的业务逻辑：
 * 1. 只处理 active 状态的订阅
 * 2. 多个订阅时选择最晚到期的
 * 3. 过期判断基于 active 状态 + 当前时间
 */
export function convertSubscriptionToPackageInfo(
  subscriptionData: null | SubscriptionApiResponse
): null | PackageInfo {
  // 基础数据检查
  if (!subscriptionData?.data || subscriptionData.data.length === 0) {
    return null
  }

  // 筛选活跃订阅
  const activeSubscriptions = subscriptionData.data.filter(
    (item) => item.status === "active"
  )

  if (activeSubscriptions.length === 0) {
    return null
  }

  // 选择最佳订阅（单个直接返回，多个选最晚到期）
  const bestSubscription =
    activeSubscriptions.length === 1
      ? activeSubscriptions[0]
      : activeSubscriptions.reduce((best, current) => {
          const bestEndTime = new Date(best.current_period_end).getTime()
          const currentEndTime = new Date(current.current_period_end).getTime()
          return currentEndTime > bestEndTime ? current : best
        })

  // 构建套餐信息
  const startDate = new Date(bestSubscription.current_period_start)
  const endDate = new Date(bestSubscription.current_period_end)
  const now = new Date()

  return {
    endDate,
    isExpired: bestSubscription.status !== "active" || now > endDate,
    packageType:
      bestSubscription.plan_name || `计划 ${bestSubscription.plan_id}`,
    startDate
  }
}
