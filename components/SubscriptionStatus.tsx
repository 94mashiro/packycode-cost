import { cn } from "../lib/utils"

interface SubscriptionStatusProps {
  endDate: Date
  isExpired?: boolean
  packageType: string
  startDate: Date
}

/**
 * 订阅状态组件 - 统一的订阅信息展示
 *
 * 设计原则：
 * - 遵循项目现有的设计系统
 * - 保持视觉层次的一致性
 * - 使用语义化的状态颜色
 * - 优雅的微交互动画
 */
export function SubscriptionStatus({
  endDate,
  isExpired = false,
  packageType,
  startDate
}: SubscriptionStatusProps) {
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

  // shadcn 风格的状态判断
  const actuallyExpired = isExpired || now > endDate
  const isUrgent = !actuallyExpired && remainingDays <= 3
  const isWarning = !actuallyExpired && !isUrgent && remainingDays <= 7

  // shadcn 风格的状态配置
  const getStatusConfig = () => {
    if (actuallyExpired) {
      return {
        label: "已过期",
        progressColor: "bg-red-500",
        textColor: "text-red-600 dark:text-red-400",
        variant: "destructive" as const
      }
    }

    if (isUrgent) {
      return {
        label: "即将到期",
        progressColor: "bg-red-500",
        textColor: "text-red-600 dark:text-red-400",
        variant: "destructive" as const
      }
    }

    if (isWarning) {
      return {
        label: "注意续费",
        progressColor: "bg-yellow-500",
        textColor: "text-yellow-600 dark:text-yellow-400",
        variant: "warning" as const
      }
    }

    return {
      label: "正常使用",
      progressColor: "bg-green-500",
      textColor: "text-green-600 dark:text-green-400",
      variant: "default" as const
    }
  }

  const statusConfig = getStatusConfig()

  // 格式化主要时间信息 - 右上角显示更精确信息
  const getPrimaryTimeInfo = () => {
    if (actuallyExpired) {
      const expiredDays = Math.abs(remainingDays)
      return `已过期 ${expiredDays} 天`
    }

    // 根据紧急程度显示不同精度的信息
    if (isUrgent) {
      // 3天内显示更精确的倒计时
      const hours = Math.floor(remainingDuration / (1000 * 60 * 60))
      const minutes = Math.floor(
        (remainingDuration % (1000 * 60 * 60)) / (1000 * 60)
      )

      if (remainingDays < 1) {
        return `剩余 ${hours}小时${minutes}分钟`
      }
      return `剩余 ${remainingDays}天 ${hours % 24}小时`
    }

    return `剩余 ${remainingDays} 天`
  }

  // 格式化日期范围 - shadcn 风格
  const formatDateRange = () => {
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("zh-CN", {
        day: "2-digit",
        month: "2-digit"
      })
    }
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }

  return (
    <div className="space-y-2">
      {/* 标题行 - 保持与其他组件一致 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          套餐状态
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{getPrimaryTimeInfo()}</span>
        </div>
      </div>

      {/* 主要内容容器 - 使用项目统一样式 */}
      <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3 space-y-3">
        {/* 套餐信息行 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {packageType}
              </span>
              {/* 只在需要警示时显示状态徽章 */}
              {statusConfig.variant !== "default" && (
                <div
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                    statusConfig.variant === "destructive" &&
                      "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/30",
                    statusConfig.variant === "warning" &&
                      "bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/20 dark:text-yellow-400 dark:ring-yellow-400/30"
                  )}>
                  {statusConfig.label}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {formatDateRange()}
            </div>
          </div>

          {/* 进度条区域 */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    statusConfig.progressColor
                  )}
                  style={{
                    width: `${Math.min(usagePercentage, 100)}%`
                  }}
                />
              </div>
            </div>
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                statusConfig.textColor
              )}>
              {actuallyExpired
                ? `过期 ${Math.abs(remainingDays)}天`
                : `${remainingDays}天`}
            </span>
          </div>
        </div>

        {/* 详细统计 - shadcn 风格的分割线和统计信息 */}
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
