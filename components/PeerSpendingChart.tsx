/**
 * Peer Spending Chart Component
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "图表渲染应该高效，避免不必要的重新计算"
 * ⚛️ Dan: "组件状态管理要清晰，数据流可预测"
 * ☕ Bloch: "API 设计要优雅，处理所有边界情况"
 * 🏛️ Fowler: "视觉层次要清晰，突出最重要的信息"
 */

import { useMemo } from "react"

import { cn } from "~/lib/utils"
import { useCombinedSpendingRanking } from "~/modules/peerSpending"

import { DEFAULT_VALUES, STYLES } from "./PeerSpendingChart.constants"
import {
  formatAmount,
  generateParticipantKey,
  getContainerClassName,
  getRankBadgeStyle,
  getRankGradient
} from "./PeerSpendingChart.utils"

/**
 * 同行消费数据图表组件
 * 以用户体验为优先，突出显示排行榜和关键指标
 *
 * 现在使用整合业务Hook，包含当前用户的完整排行榜
 */
export function PeerSpendingChart() {
  const { error, loading, rankings, summary } = useCombinedSpendingRanking()

  // 显示的排行榜数量
  const displayRankings = useMemo(
    () => rankings.slice(0, DEFAULT_VALUES.MAX_DISPLAY_COUNT),
    [rankings]
  )

  // 加载状态 - 遵循 SWR 模式：只有在没有缓存数据时才显示骨架屏
  if (loading && !rankings.length) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            乘客消费排行榜
          </h3>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-4 shadow-sm">
          {/* 汇总信息骨架 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
            </div>
            <div className="space-y-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
            </div>
          </div>

          <div className="border-t border-gray-200/60 dark:border-gray-700/50"></div>

          {/* 排行榜骨架 */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div className="flex items-center gap-3" key={i}>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-3"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-20"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
                  </div>
                  <div className="overflow-hidden rounded-full bg-gray-200 h-1 dark:bg-gray-700">
                    <div
                      className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"
                      style={{ width: `${30 + i * 20}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            乘客消费排行榜
          </h3>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg p-4 shadow-sm">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    )
  }

  // 无数据状态 - 公交车模式下直接不渲染
  if (!rankings.length) {
    return null
  }

  return (
    <div className="space-y-2">
      {/* 标题行 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          乘客消费排行榜
        </h3>
      </div>

      {/* 图表容器 - shadcn/ui 风格 */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-4 shadow-sm">
        {/* 汇总指标 - shadcn/ui 卡片风格 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              总消费
            </span>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              ${summary.totalSpent.toFixed(2)}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              平均消费
            </span>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              ${summary.averageSpent.toFixed(2)}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              参与人数
            </span>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {summary.totalParticipants} 人
            </div>
          </div>
        </div>

        {/* 分隔线 - 更细腻的风格 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
          </div>
        </div>

        {/* 排行榜图表 - 核心功能 */}
        <div className="space-y-2">
          {displayRankings.map((participant) => (
            <div
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
                getContainerClassName(participant.isCurrentUser)
              )}
              key={generateParticipantKey(participant)}>
              {/* 排名徽章 - shadcn chart 风格 */}
              <div className="relative">
                <div
                  className={cn(
                    "flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold transition-all",
                    getRankBadgeStyle(
                      participant.rank,
                      participant.isCurrentUser
                    )
                  )}>
                  {participant.rank}
                </div>
                {participant.isCurrentUser && (
                  <div className={STYLES.CURRENT_USER_INDICATOR} />
                )}
              </div>

              {/* 进度条和数据 */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs truncate max-w-[120px]",
                      participant.isCurrentUser
                        ? "font-bold text-gray-900 dark:text-gray-100"
                        : "font-medium text-gray-900 dark:text-gray-100"
                    )}>
                    {participant.displayName}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      participant.isCurrentUser
                        ? "font-bold text-gray-900 dark:text-gray-100"
                        : "font-medium text-gray-700 dark:text-gray-300"
                    )}>
                    $
                    {formatAmount(
                      participant.spentToday,
                      DEFAULT_VALUES.ZERO_AMOUNT
                    )}
                  </span>
                </div>

                {/* 可视化进度条 - shadcn chart 风格 */}
                <div className="relative overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-500 relative",
                      getRankGradient(participant.rank)
                    )}
                    style={{
                      width: `${participant.percentage}%`
                    }}>
                    {participant.isCurrentUser && (
                      <div className="absolute inset-0 bg-white/30 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
