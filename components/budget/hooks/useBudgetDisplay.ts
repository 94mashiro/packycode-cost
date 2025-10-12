import {
  useCapabilities,
  useFinance
} from "~/hooks/infrastructure/useStorageHooks"
import { useAccountManager } from "~/hooks/useAccountManager"
import { PackySite } from "~/types/account"

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
 * - 支持多账号模式：WWW 公交车模式展示余额，其他模式展示预算
 * - 数据分流：根据账号站点提供不同的数据结构
 */

export interface UseBudgetDisplayReturn {
  /** 当前账号站点 */
  accountSite: PackySite
  /** 余额信息（仅 WWW 公交车模式） */
  balanceData: null | {
    balance: string
  }
  /** 用户预算信息（SHARED 滴滴车 和 CODEX 模式） */
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
 * 5. 账号站点判断（新增）
 */
export function useBudgetDisplay(): UseBudgetDisplayReturn {
  const { data: finance, error, loading } = useFinance()
  const { data: capabilities } = useCapabilities()
  const { currentAccount } = useAccountManager() // 从当前账号读取

  // 从当前激活账号读取站点
  const accountSite = currentAccount?.site ?? PackySite.WWW

  // WWW 公交车模式：提取余额数据
  const balanceData =
    accountSite === PackySite.WWW && finance?.payg?.balance
      ? {
          balance: finance.payg.balance
        }
      : null

  // 其他模式（SHARED 滴滴车、CODEX）：提取预算数据
  const budgetData =
    accountSite !== PackySite.WWW && finance?.budget
      ? {
          dailyBudget: finance.budget.daily.limit,
          dailySpent: finance.budget.daily.spent,
          monthlyBudget: finance.budget.monthly.limit,
          monthlySpent: finance.budget.monthly.spent,
          rateLimitResetAt: capabilities?.rateLimitResetAt ?? null
        }
      : null

  return {
    accountSite,
    balanceData,
    budgetData,
    error,
    loading
  }
}
