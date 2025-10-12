import { type SubscriptionDomain } from "~/types/account"

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
 * 1. 直接从 SubscriptionDomain 读取数据（已经是第一个订阅项）
 * 2. 过期判断基于 status + 当前时间
 * 3. SubscriptionDomain 已经通过 transformer 提取了核心字段
 */
export function convertSubscriptionToPackageInfo(
  subscription: null | SubscriptionDomain
): null | PackageInfo {
  // 基础数据检查
  if (!subscription) {
    return null
  }

  // 构建套餐信息
  const startDate = new Date()
  const endDate = new Date(subscription.currentPeriodEnd)
  const now = new Date()

  return {
    endDate,
    isExpired: subscription.status !== "active" || now > endDate,
    packageType: subscription.planName || "未知计划",
    startDate
  }
}
