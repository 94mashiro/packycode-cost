/**
 * 订阅信息骨架屏组件
 *
 * 职责：提供加载状态的视觉反馈
 * 设计：与现有预算组件的骨架屏保持一致
 */
export function SubscriptionSkeleton() {
  return (
    <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-20"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
        </div>
        <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
          <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-1/2"></div>
        </div>
      </div>
    </div>
  )
}
