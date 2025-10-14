/**
 * 账户余额显示组件
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "简单直接，无复杂计算，高效渲染"
 * ⚛️ Dan: "清晰的视觉层次，信息密度适中"
 * ☕ Bloch: "API 设计简洁，单一职责"
 * 🏛️ Fowler: "领域驱动，余额展示独立于预算概念"
 *
 * 设计风格: 融合 CombinedStatus 的信息层次和 CombinedBudget 的轻量卡片
 */

interface AccountBalanceProps {
  /** 账户余额（美元字符串格式，可选） */
  balance?: string
  /** 今日消费金额（可选） */
  dailySpent?: number
}

export function AccountBalance({ balance, dailySpent }: AccountBalanceProps) {
  // 格式化余额：确保显示为数字格式
  const safeBalance = balance ? Number(balance) || 0 : undefined
  const formattedBalance =
    safeBalance !== undefined ? safeBalance.toFixed(2) : undefined

  // 余额状态判断
  const getBalanceStatus = (amount: number | undefined) => {
    if (amount === undefined)
      return {
        color: "bg-gray-300 dark:bg-gray-600",
        level: "loading",
        text: "加载中"
      }
    if (amount <= 0)
      return { color: "bg-red-500", level: "danger", text: "余额不足" }
    if (amount < 10)
      return { color: "bg-yellow-500", level: "warning", text: "余额偏低" }
    if (amount < 50)
      return { color: "bg-blue-500", level: "normal", text: "余额正常" }
    return { color: "bg-green-500", level: "good", text: "余额充足" }
  }

  const status = getBalanceStatus(safeBalance)

  // 余额文本颜色
  const getBalanceTextColor = () => {
    if (status.level === "loading") return "text-gray-400 dark:text-gray-500"
    if (status.level === "danger") return "text-red-600 dark:text-red-400"
    if (status.level === "warning")
      return "text-yellow-600 dark:text-yellow-400"
    return "text-gray-900 dark:text-gray-100"
  }

  return (
    <div className="space-y-1.5">
      {/* 标题行 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          账户余额
        </h3>
      </div>

      {/* 余额卡片 */}
      <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3">
        <div className="space-y-2">
          {/* 两栏网格：余额 + 今日消费 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 左列：余额显示区域 */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {status.text}
                </span>
              </div>
              {formattedBalance !== undefined ? (
                <div className={`text-2xl font-bold ${getBalanceTextColor()}`}>
                  ${formattedBalance}
                </div>
              ) : (
                <div className="h-7 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                可用余额
              </div>
            </div>

            {/* 右列：今日消费统计 */}
            <div className="space-y-1">
              {/* 占位空间：与左列状态指示器等高 */}
              <div className="h-4"></div>
              {dailySpent !== undefined ? (
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  ${dailySpent.toFixed(2)}
                </div>
              ) : (
                <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                今日消费
              </div>
            </div>
          </div>

          {/* 信息提示区域 */}
          <div className="pt-1">
            <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24">
                <path
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>消费从余额实时扣除，无重置周期</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
