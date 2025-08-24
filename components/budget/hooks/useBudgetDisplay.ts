import { useUserInfo } from "~/hooks"

/**
 * 预算显示 Hook
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "状态管理要简洁高效，避免不必要的复杂度"
 * ⚛️ Dan: "封装复杂的状态逻辑，提供简单清晰的API"
 * ☕ Bloch: "API设计要优雅，错误处理要完善"
 * 🏛️ Fowler: "单一职责原则，只处理预算显示相关逻辑"
 */

export interface UseBudgetDisplayReturn {
  /** 用户预算信息 */
  budgetData: null | {
    dailyBudget: number
    dailySpent: number
    monthlyBudget: number
    monthlySpent: number
  }
  /** 错误信息 */
  error: null | string
  /** 是否正在加载 */
  loading: boolean
}

/**
 * 预算显示状态管理 Hook
 *
 * 封装所有预算显示相关的逻辑：
 * 1. 数据获取状态管理
 * 2. 数据提取和转换
 * 3. 错误处理
 * 4. 加载状态管理
 */
export function useBudgetDisplay(): UseBudgetDisplayReturn {
  const { data: userInfo, error, loading } = useUserInfo()

  // 数据转换：从UserInfo提取预算相关字段
  const budgetData = userInfo
    ? {
        dailyBudget: userInfo.budgets.daily.limit,
        dailySpent: userInfo.budgets.daily.spent,
        monthlyBudget: userInfo.budgets.monthly.limit,
        monthlySpent: userInfo.budgets.monthly.spent
      }
    : null

  return {
    budgetData,
    error,
    loading
  }
}
