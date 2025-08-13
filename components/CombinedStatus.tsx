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

  const isApiKey = tokenData.tokenType === "api_key"
  const isAuthenticated =
    tokenData.isValid && (isApiKey || !tokenExpiration.isExpired)
  const purchaseAvailable = purchaseConfig && !purchaseConfig.purchaseDisabled

  return (
    <div className="space-y-3">
      {/* 认证状态区块 */}
      <div className="border border-gray-200 bg-gray-50/30 rounded-md px-3 py-2.5 dark:border-gray-700/60 dark:bg-gray-800/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-1 h-1 rounded-full ${
                isAuthenticated ? "bg-green-500" : "bg-orange-500"
              }`}></div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isAuthenticated
                ? isApiKey
                  ? "API Key 模式"
                  : "JWT Token 模式"
                : "需要认证"}
            </span>
          </div>

          {!isAuthenticated && (
            <button
              className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              onClick={() =>
                chrome.tabs.create({
                  url: "https://www.packycode.com/dashboard"
                })
              }>
              登录
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed">
          {isAuthenticated ? (
            <div className="flex items-center justify-between">
              <span>
                {isApiKey ? "长期有效" : `${tokenExpiration.formatted}到期`}
              </span>
              {!isApiKey && (
                <span className="text-gray-400 dark:text-gray-600 text-[10px]">
                  控制台点击复制切换至 APIKEY 模式
                </span>
              )}
            </div>
          ) : (
            <span>
              {!tokenData.isValid
                ? "登录后即可查看使用额度"
                : "会话已过期，需重新认证"}
            </span>
          )}
        </div>
      </div>

      {/* 购买状态区块 - 独立展示 */}
      <div className="border border-gray-200 bg-gray-50/30 rounded-md px-3 py-2.5 dark:border-gray-700/60 dark:bg-gray-800/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {purchaseLoading ? (
              <>
                <div className="w-1 h-1 rounded-full bg-gray-400 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  检查购买状态...
                </span>
              </>
            ) : purchaseConfig ? (
              <>
                <div
                  className={`w-1 h-1 rounded-full ${
                    purchaseAvailable ? "bg-blue-500" : "bg-gray-400"
                  }`}></div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {purchaseAvailable ? "购买开放" : "购买暂停"}
                </span>
              </>
            ) : (
              <>
                <div className="w-1 h-1 rounded-full bg-gray-400 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  正在获取状态...
                </span>
              </>
            )}
          </div>

          {purchaseAvailable && (
            <button
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              onClick={() =>
                chrome.tabs.create({ url: "https://www.packycode.com/pricing" })
              }>
              立即购买
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed">
          {purchaseLoading
            ? "正在获取最新购买状态..."
            : purchaseConfig
              ? purchaseAvailable
                ? "当前可以进行购买操作"
                : "购买功能暂时关闭，请等待下次开放"
              : "等待后台轮询获取状态..."}
        </div>
      </div>
    </div>
  )
}
