import { useEffect, useState } from "react"

import { cn } from "../lib/utils"

interface PackageExpiryProps {
  endDate: Date
  isExpired?: boolean
  packageType: string
  startDate: Date
}

export function PackageExpiry({
  endDate,
  isExpired = false,
  packageType,
  startDate
}: PackageExpiryProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  // 计算套餐使用情况
  const now = new Date()
  const totalDuration = endDate.getTime() - startDate.getTime()
  const usedDuration = now.getTime() - startDate.getTime()
  const remainingDuration = endDate.getTime() - now.getTime()

  // 计算总天数和已使用天数
  const totalDays = Math.ceil(totalDuration / (1000 * 60 * 60 * 24))
  const usedDays = Math.ceil(usedDuration / (1000 * 60 * 60 * 24))
  const remainingDays = Math.ceil(remainingDuration / (1000 * 60 * 60 * 24))

  // 计算进度百分比
  const usagePercentage =
    totalDuration > 0 ? Math.min((usedDuration / totalDuration) * 100, 100) : 0

  // 判断状态
  const actuallyExpired = isExpired || now > endDate
  const isNearExpiry = !actuallyExpired && remainingDays <= 7
  const isWarning = !actuallyExpired && !isNearExpiry && remainingDays <= 30

  // 倒计时逻辑
  useEffect(() => {
    if (actuallyExpired) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      return
    }

    const updateCountdown = () => {
      const diff = endDate.getTime() - new Date().getTime()

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      )
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [endDate, actuallyExpired])

  const getProgressColor = () => {
    if (actuallyExpired) return "bg-red-500"
    if (isNearExpiry) return "bg-red-500"
    if (isWarning) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getTextColor = () => {
    if (actuallyExpired) return "text-red-600"
    if (isNearExpiry) return "text-red-600"
    if (isWarning) return "text-yellow-600"
    return "text-green-600"
  }

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, "0")
  }

  const formatDateRange = () => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("zh-CN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      })
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  const getStatusText = () => {
    if (actuallyExpired) {
      const expiredDays = Math.abs(remainingDays)
      return `已过期 ${expiredDays} 天`
    }
    return `剩余 ${remainingDays} 天`
  }

  const getCountdownText = () => {
    if (actuallyExpired) return "已过期"
    if (timeLeft.days === 0) {
      return `${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`
    }
    return `${timeLeft.days}天 ${formatTime(timeLeft.hours)}:${formatTime(timeLeft.minutes)}:${formatTime(timeLeft.seconds)}`
  }

  return (
    <div className="space-y-2">
      {/* 标题行 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          套餐状态
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{getCountdownText()}</span>
        </div>
      </div>

      {/* 套餐信息卡片 */}
      <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3 space-y-3">
        {/* 套餐类型行 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {packageType}
            </span>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {formatDateRange()}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    getProgressColor()
                  )}
                  style={{
                    width: `${Math.min(usagePercentage, 100)}%`
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium", getTextColor())}>
                {usagePercentage.toFixed(1)}%
              </span>
              <span className={cn("text-[10px]", getTextColor())}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* 使用天数信息 */}
        <div className="border-t border-gray-200/60 dark:border-gray-700/50 pt-2">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>已使用: {Math.max(0, usedDays)} 天</span>
            <span>总计: {totalDays} 天</span>
          </div>
        </div>
      </div>
    </div>
  )
}
