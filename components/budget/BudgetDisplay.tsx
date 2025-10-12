import { PackySite } from "~/types/account"

import { CombinedBudget } from "../CombinedBudget"
import { AccountBalance } from "./components/AccountBalance"
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
 * - 🔀 多模式支持：WWW 公交车模式展示余额，其他模式展示预算
 */
export function BudgetDisplay() {
  const { accountSite, balanceData, budgetData, error, loading } =
    useBudgetDisplay()

  // 加载状态
  if (loading) {
    return <BudgetSkeleton />
  }

  // 错误状态 - 显示错误信息
  if (error) {
    return <BudgetError error={error} />
  }

  // WWW 公交车模式 - 显示账户余额
  if (accountSite === PackySite.WWW && balanceData) {
    return <AccountBalance balance={balanceData.balance} />
  }

  // 其他模式 (SHARED 滴滴车, CODEX) - 显示预算信息
  if (budgetData) {
    return (
      <CombinedBudget
        dailyBudget={budgetData.dailyBudget}
        dailySpent={budgetData.dailySpent}
        monthlyBudget={budgetData.monthlyBudget}
        monthlySpent={budgetData.monthlySpent}
        rateLimitResetAt={budgetData.rateLimitResetAt}
      />
    )
  }

  // 无数据状态 - 优雅隐藏，不显示任何内容
  // 产品理念：没有预算数据时，用户不应该感知到这个功能的存在
  return <span>Nothing to show</span>
}
