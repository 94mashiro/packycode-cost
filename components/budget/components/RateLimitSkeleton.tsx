export function RateLimitSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
      </div>

      <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-14"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-2/5"></div>
              </div>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-8"></div>
          </div>
        </div>

        <div className="border-t border-gray-200/60 dark:border-gray-700/50"></div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-3/5"></div>
              </div>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-8"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
