import { useUserInfo, useUserPreference } from "~/hooks"
import { useSystemPreference } from "~/hooks/infrastructure/useStorageHooks"
import { AccountVersion } from "~/types"

/**
 * 预算显示 Hook
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "状态管理要简洁高效，避免不必要的复杂度"
 * ⚛️ Dan: "封装复杂的状态逻辑，提供简单清晰的API"
 * ☕ Bloch: "API设计要优雅，错误处理要完善"
 * 🏛️ Fowler: "单一职责原则，只处理预算显示相关逻辑"
 *
 * 改造说明 (v2):
 * - 支持多账号模式：Shared 公交车模式展示余额，其他模式展示预算
 * - 数据分流：根据账号类型提供不同的数据结构
 */

export interface UseBudgetDisplayReturn {
  /** 当前账号类型 */
  accountVersion: AccountVersion
  /** 余额信息（仅 Shared 模式） */
  balanceData: null | {
    balance: string
  }
  /** 用户预算信息（PRIVATE 和 CODEX_SHARED 模式） */
  budgetData: null | {
    dailyBudget: number
    dailySpent: number
    monthlyBudget: number
    monthlySpent: number
    rateLimitResetAt?: null | string
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
 * 5. 账号模式判断（新增）
 */
export function useBudgetDisplay(): UseBudgetDisplayReturn {
  const { data: userInfo, error, loading } = useUserInfo()
  const { data: systemPref } = useSystemPreference()
  const { data: userPreference } = useUserPreference()

  // 获取当前账号类型，默认为 SHARED
  const accountVersion =
    userPreference?.account_version ?? AccountVersion.SHARED

  // Shared 模式：提取余额数据
  const balanceData =
    accountVersion === AccountVersion.SHARED && userInfo?.balance_usd
      ? {
          balance: userInfo.balance_usd
        }
      : null

  // 其他模式：提取预算数据（现有逻辑）
  const budgetData =
    accountVersion !== AccountVersion.SHARED && userInfo
      ? {
          dailyBudget: userInfo.budgets.daily.limit,
          dailySpent: userInfo.budgets.daily.spent,
          monthlyBudget: userInfo.budgets.monthly.limit,
          monthlySpent: userInfo.budgets.monthly.spent,
          rateLimitResetAt: systemPref?.rate_limit_reset_at
        }
      : null

  return {
    accountVersion,
    balanceData,
    budgetData,
    error,
    loading
  }
}
