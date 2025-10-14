import { PackySite } from "~/types/account"

import { CombinedBudget } from "../CombinedBudget"
import { AccountBalance } from "./components/AccountBalance"
import { BudgetError } from "./components/BudgetError"
import { BudgetSkeleton } from "./components/BudgetSkeleton"
import { RateLimitProgress } from "./components/RateLimitProgress"
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
  const { accountSite, balanceData, budgetData, error, latestUsage, loading } =
    useBudgetDisplay()

  // 加载状态
  if (loading) {
    return <BudgetSkeleton />
  }

  // 错误状态 - 显示错误信息
  if (error) {
    return <BudgetError error={error} />
  }

  // WWW 公交车模式 - 显示账户余额（始终渲染）
  if (accountSite === PackySite.WWW) {
    return (
      <AccountBalance
        balance={balanceData?.balance}
        dailySpent={balanceData?.dailySpent}
      />
    )
  }

  // 其他模式 (SHARED 滴滴车, CODEX) - 显示预算信息
  // 滴滴车模式且有限流数据：使用水平并列布局
  if (accountSite === PackySite.SHARED) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <CombinedBudget
          dailyBudget={budgetData.dailyBudget}
          dailySpent={budgetData.dailySpent}
          monthlyBudget={budgetData.monthlyBudget}
          monthlySpent={budgetData.monthlySpent}
          rateLimitResetAt={budgetData.rateLimitResetAt}
        />
        <RateLimitProgress latestUsage={latestUsage} />
      </div>
    )
  }

  // 其他情况：只显示预算信息
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
