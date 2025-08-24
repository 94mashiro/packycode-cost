/**
 * 预算加载骨架屏组件
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "加载状态要高效渲染，避免重复计算"
 * ⚛️ Dan: "提供视觉连续性，减少加载时的跳跃感"
 * ☕ Bloch: "组件API简单，无需参数配置"
 * 🏛️ Fowler: "视觉设计与实际内容保持一致的布局"
 */

export function BudgetSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
      </div>

      <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3 space-y-3">
        {/* 日预算骨架 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-20"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-1/3"></div>
              </div>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-gray-200/60 dark:border-gray-700/50"></div>

        {/* 月预算骨架 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-20"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-2/3"></div>
              </div>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
