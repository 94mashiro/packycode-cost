import { usePurchaseStatus } from "../hooks"

export function PurchaseStatus() {
  const { config, error, loading, refresh } = usePurchaseStatus()

  if (loading) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center space-x-2">
          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            检查购买状态...
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center space-x-2">
          <div className="h-1.5 w-1.5 bg-red-400 rounded-full"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            购买状态获取失败
          </span>
        </div>
        <button
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          onClick={refresh}>
          重试
        </button>
      </div>
    )
  }

  if (!config) return null

  const isAvailable = !config.purchaseDisabled

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2">
        <div
          className={`h-1.5 w-1.5 rounded-full ${
            isAvailable ? "bg-emerald-500" : "bg-gray-400"
          }`}></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {isAvailable ? "购买开放" : "购买暂停"}
        </span>
      </div>

      {isAvailable && config.purchaseUrl && (
        <button
          className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
          onClick={() => chrome.tabs.create({ url: config.purchaseUrl })}>
          购买
        </button>
      )}
    </div>
  )
}
