import { SubscriptionStatus } from "~/components/SubscriptionStatus"

import { useSubscriptionDisplay } from "../hooks/useSubscriptionDisplay"
import { SubscriptionError } from "./SubscriptionError"
import { SubscriptionSkeleton } from "./SubscriptionSkeleton"

/**
 * 订阅信息显示容器组件
 *
 * 四师设计理念的完美体现：
 *
 * 🐧 Linus: 单一职责，只负责订阅信息的显示逻辑
 * ⚛️ Dan: 组件化思维，封装复杂状态，提供简单API
 * ☕ Bloch: 优雅的API设计，零参数，零配置，零依赖
 * 🏛️ Fowler: 领域驱动，订阅聚合完全独立于其他聚合
 */

export function SubscriptionDisplay() {
  const { error, loading, packageInfo } = useSubscriptionDisplay()

  // 加载状态
  if (loading) {
    return <SubscriptionSkeleton />
  }

  // 错误状态 - 显示错误信息
  if (error) {
    return <SubscriptionError error={error} />
  }

  // 有效数据状态 - 显示套餐信息
  if (packageInfo) {
    return (
      <SubscriptionStatus
        endDate={packageInfo.endDate}
        isExpired={packageInfo.isExpired}
        packageType={packageInfo.packageType}
        startDate={packageInfo.startDate}
      />
    )
  }

  // 无数据状态 - 优雅隐藏，不显示任何内容
  // 产品理念：没有订阅数据时，用户不应该感知到这个功能的存在
  return null
}
