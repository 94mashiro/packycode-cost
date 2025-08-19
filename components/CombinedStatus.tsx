import { useOpusStatus } from "../hooks/useOpusStatus"
import { usePurchaseStatus } from "../hooks/usePurchaseStatus"

interface CombinedStatusProps {
  tokenData: TokenData
  tokenExpiration: TokenExpiration
}

interface TokenData {
  isValid: boolean
  tokenType?: "api_key" | "jwt" | null
}

interface TokenExpiration {
  formatted: string
  isExpired: boolean
}

export function CombinedStatus({
  tokenData,
  tokenExpiration
}: CombinedStatusProps) {
  const { config: purchaseConfig, loading: purchaseLoading } =
    usePurchaseStatus()
  const { enabled: opusEnabled, loading: opusLoading } = useOpusStatus()

  const isApiKey = tokenData.tokenType === "api_key"
  const isAuthenticated =
    tokenData.isValid && (isApiKey || !tokenExpiration.isExpired)
  const purchaseAvailable = purchaseConfig && !purchaseConfig.purchaseDisabled

  return (
    <div className="space-y-2">
      {/* 标题行 - 移到容器外 */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          服务状态
        </h3>
        {(purchaseLoading || opusLoading) && (
          <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        )}
      </div>

      {/* 状态网格 - 3列布局 */}
      <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3">
        <div className="grid grid-cols-3 gap-4">
          {/* 认证状态 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isAuthenticated ? "bg-green-500" : "bg-orange-500"
                }`}></div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {isAuthenticated ? (isApiKey ? "API Key" : "JWT") : "未认证"}
              </span>
            </div>
            <div className="min-h-[24px] flex items-center">
              {!isAuthenticated ? (
                <button
                  className="text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors underline decoration-blue-700 dark:decoration-blue-400 underline-offset-2"
                  onClick={() =>
                    chrome.tabs.create({
                      url: "https://www.packycode.com/dashboard"
                    })
                  }>
                  点击登录
                </button>
              ) : (
                <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {isApiKey ? "长期有效" : `${tokenExpiration.formatted}失效`}
                </span>
              )}
            </div>
          </div>

          {/* 购买状态 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  purchaseLoading
                    ? "bg-gray-400 animate-pulse"
                    : purchaseAvailable
                      ? "bg-blue-500"
                      : "bg-gray-400"
                }`}></div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {purchaseLoading
                  ? "检查中"
                  : purchaseAvailable
                    ? "购买开放"
                    : "购买暂停"}
              </span>
            </div>
            <div className="min-h-[24px] flex items-center">
              {purchaseAvailable ? (
                <button
                  className="text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors underline decoration-blue-700 dark:decoration-blue-400 underline-offset-2"
                  onClick={() =>
                    chrome.tabs.create({
                      url: "https://www.packycode.com/pricing"
                    })
                  }>
                  立即购买
                </button>
              ) : (
                <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {purchaseLoading ? "获取状态中..." : "等待下次开放"}
                </span>
              )}
            </div>
          </div>

          {/* Opus 状态 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  opusLoading
                    ? "bg-gray-400 animate-pulse"
                    : opusEnabled
                      ? "bg-purple-500"
                      : "bg-gray-400"
                }`}></div>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {opusLoading
                  ? "检查中"
                  : opusEnabled
                    ? "Opus 开启"
                    : "Opus 关闭"}
              </span>
            </div>
            <div className="min-h-[24px] flex items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {opusLoading
                  ? "获取状态中..."
                  : opusEnabled
                    ? "高级模型可用"
                    : "当前基础模型"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
