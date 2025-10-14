import { useEffect, useState } from "react"

import type { CapabilitiesDomain } from "~/types/account"

import { cn } from "~/lib/utils"
import {
  formatFiveHourRemaining,
  formatSevenDayRemaining
} from "~/utils/rateLimitTime"

import { RateLimitSkeleton } from "./RateLimitSkeleton"

interface RateLimitBarProps {
  label: string
  timeRemaining: string
  utilization: number
}

interface RateLimitProgressProps {
  latestUsage?: CapabilitiesDomain["latestUsage"]
}

/**
 * 限流进度组件
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: 紧凑高效的设计，不占用过多空间
 * ⚛️ Dan: 完全复用现有设计系统，视觉一致性
 * ☕ Bloch: 清晰的进度指示，明确的颜色语义
 * 🏛️ Fowler: 领域逻辑独立，仅在滴滴车模式显示
 *
 * 功能说明:
 * - 展示5小时档和7天档的限流进度
 * - 使用进度条可视化 utilization 百分比
 * - 实时更新剩余时间倒计时
 * - 颜色编码: 绿色(0-50%) → 黄色(51-80%) → 红色(81-100%)
 */
export function RateLimitProgress({ latestUsage }: RateLimitProgressProps) {
  if (!latestUsage) {
    return <RateLimitSkeleton />
  }

  const [fiveHourRemaining, setFiveHourRemaining] = useState("")
  const [sevenDayRemaining, setSevenDayRemaining] = useState("")

  // 实时更新剩余时间
  useEffect(() => {
    const updateTime = () => {
      setFiveHourRemaining(
        formatFiveHourRemaining(latestUsage.fiveHourResetsAt)
      )
      setSevenDayRemaining(
        formatSevenDayRemaining(latestUsage.sevenDayResetsAt)
      )
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // 每分钟更新一次

    return () => clearInterval(interval)
  }, [latestUsage])

  return (
    <div className="space-y-2">
      {/* 标题行 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          限流进度
        </h3>
      </div>

      {/* 进度卡片 */}
      <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3 space-y-3">
        {/* 5小时档 */}
        <RateLimitBar
          label="5小时档"
          timeRemaining={fiveHourRemaining}
          utilization={latestUsage.fiveHourUtilization}
        />

        {/* 分隔线 */}
        <div className="border-t border-gray-200/60 dark:border-gray-700/50"></div>

        {/* 7天档 */}
        <RateLimitBar
          label="7天档"
          timeRemaining={sevenDayRemaining}
          utilization={latestUsage.sevenDayUtilization}
        />
      </div>
    </div>
  )
}

/**
 * 限流进度条子组件
 *
 * 设计原则:
 * - 单一职责：只负责单个档位的进度展示
 * - 自包含：颜色逻辑完全封装在组件内部
 * - 可复用：通过 props 适配不同档位
 */
function RateLimitBar({
  label,
  timeRemaining,
  utilization
}: RateLimitBarProps) {
  const getProgressColor = (utilization: number) => {
    if (utilization > 80) return "bg-red-500"
    if (utilization > 50) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getTextColor = (utilization: number) => {
    if (utilization > 80) return "text-red-600"
    if (utilization > 50) return "text-yellow-600"
    return "text-green-600"
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
          {label}
        </span>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          重置：{timeRemaining}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                getProgressColor(utilization)
              )}
              style={{
                width: `${Math.min(utilization, 100)}%`
              }}
            />
          </div>
        </div>
        <span className={cn("text-xs font-medium", getTextColor(utilization))}>
          {utilization}%
        </span>
      </div>
    </div>
  )
}
