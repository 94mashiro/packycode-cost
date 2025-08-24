import { CombinedBudget } from "~/components/CombinedBudget"

import { BudgetError } from "./components/BudgetError"
import { BudgetSkeleton } from "./components/BudgetSkeleton"
import { useBudgetDisplay } from "./hooks/useBudgetDisplay"

/**
 * 预算显示容器组件
 *
 * 四师设计理念的完美体现：
 *
 * 🐧 Linus: 单一职责，只负责预算信息的显示逻辑
 * ⚛️ Dan: 组件化思维，封装复杂状态，提供简单API
 * ☕ Bloch: 优雅的API设计，零参数，零配置，零依赖
 * 🏛️ Fowler: 领域驱动，预算聚合完全独立于其他聚合
 *
 * 使用方式：
 * ```tsx
 * <BudgetDisplay />
 * ```
 *
 * 特性：
 * - 🔄 自动处理加载、错误、无数据状态
 * - 🎨 与现有设计系统完全一致
 * - 📱 响应式设计，支持暗黑模式
 * - 🧪 易于测试，状态逻辑完全封装
 */
export function BudgetDisplay() {
  const { budgetData, error, loading } = useBudgetDisplay()

  // 加载状态
  if (loading) {
    return <BudgetSkeleton />
  }

  // 错误状态 - 显示错误信息
  if (error) {
    return <BudgetError error={error} />
  }

  // 有效数据状态 - 显示预算信息
  if (budgetData) {
    return (
      <CombinedBudget
        dailyBudget={budgetData.dailyBudget}
        dailySpent={budgetData.dailySpent}
        monthlyBudget={budgetData.monthlyBudget}
        monthlySpent={budgetData.monthlySpent}
      />
    )
  }

  // 无数据状态 - 优雅隐藏，不显示任何内容
  // 产品理念：没有预算数据时，用户不应该感知到这个功能的存在
  return null
}
