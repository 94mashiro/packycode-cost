import { useEffect, useState } from "react"

import { cn } from "../lib/utils"

interface CombinedBudgetProps {
  dailyBudget: number
  dailySpent: number
  monthlyBudget: number
  monthlySpent: number
}

export function CombinedBudget({
  dailyBudget,
  dailySpent,
  monthlyBudget,
  monthlySpent
}: CombinedBudgetProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number
    minutes: number
    seconds: number
  }>({ hours: 0, minutes: 0, seconds: 0 })

  // 计算日预算数据
  const safeDailySpent =
    typeof dailySpent === "number" && !isNaN(dailySpent) ? dailySpent : 0
  const safeDailyBudget =
    typeof dailyBudget === "number" && !isNaN(dailyBudget) ? dailyBudget : 0
  const dailyPercentage =
    safeDailyBudget > 0
      ? Math.min((safeDailySpent / safeDailyBudget) * 100, 100)
      : 0
  const isDailyOverBudget = safeDailySpent > safeDailyBudget

  // 计算月预算数据
  const safeMonthlySpent =
    typeof monthlySpent === "number" && !isNaN(monthlySpent) ? monthlySpent : 0
  const safeMonthlyBudget =
    typeof monthlyBudget === "number" && !isNaN(monthlyBudget)
      ? monthlyBudget
      : 0
  const monthlyPercentage =
    safeMonthlyBudget > 0
      ? Math.min((safeMonthlySpent / safeMonthlyBudget) * 100, 100)
      : 0
  const isMonthlyOverBudget = safeMonthlySpent > safeMonthlyBudget

  // 倒计时逻辑
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const diff = tomorrow.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  const getProgressColor = (percentage: number, isOverBudget: boolean) => {
    if (isOverBudget) return "bg-red-500"
    if (percentage > 80) return "bg-yellow-500"
    return "bg-blue-500"
  }

  const getTextColor = (percentage: number, isOverBudget: boolean) => {
    if (isOverBudget) return "text-red-600"
    if (percentage > 80) return "text-yellow-600"
    return "text-blue-600"
  }

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, "0")
  }

  return (
    <div className="space-y-2">
      {/* 标题行 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          预算使用情况
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            重置: {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:
            {formatTime(timeLeft.seconds)}
          </span>
        </div>
      </div>

      {/* 预算网格 */}
      <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3 space-y-3">
        {/* 日预算行 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              日预算
            </span>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              ${safeDailySpent.toFixed(2)} / ${safeDailyBudget.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    getProgressColor(dailyPercentage, isDailyOverBudget)
                  )}
                  style={{
                    width: `${Math.min(dailyPercentage, 100)}%`
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  getTextColor(dailyPercentage, isDailyOverBudget)
                )}>
                {dailyPercentage.toFixed(1)}%
              </span>
              {isDailyOverBudget && (
                <span className="text-[10px] text-red-600">
                  +${(safeDailySpent - safeDailyBudget).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-gray-200/60 dark:border-gray-700/50"></div>

        {/* 月预算行 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              月预算
            </span>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              ${safeMonthlySpent.toFixed(2)} / ${safeMonthlyBudget.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    getProgressColor(monthlyPercentage, isMonthlyOverBudget)
                  )}
                  style={{
                    width: `${Math.min(monthlyPercentage, 100)}%`
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  getTextColor(monthlyPercentage, isMonthlyOverBudget)
                )}>
                {monthlyPercentage.toFixed(1)}%
              </span>
              {isMonthlyOverBudget && (
                <span className="text-[10px] text-red-600">
                  +${(safeMonthlySpent - safeMonthlyBudget).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
