import { useEffect, useState } from "react"

import { dynamicApiUrls } from "../api"
import { useOpusStatus, usePurchaseStatus } from "../hooks"
import { type TokenData, type TokenExpiration, TokenType } from "../types"

interface CombinedStatusProps {
  tokenData: TokenData
  tokenExpiration: TokenExpiration
}

export function CombinedStatus({
  tokenData,
  tokenExpiration
}: CombinedStatusProps) {
  const { config: purchaseConfig, loading: purchaseLoading } =
    usePurchaseStatus()
  const { enabled: opusEnabled, loading: opusLoading } = useOpusStatus()

  // 动态获取URL状态
  const [dashboardUrl, setDashboardUrl] = useState<string>("")
  const [pricingUrl, setPricingUrl] = useState<string>("")

  useEffect(() => {
    // 获取动态URL
    const loadUrls = async () => {
      try {
        const [dashboard, pricing] = await Promise.all([
          dynamicApiUrls.getDashboardUrl(),
          dynamicApiUrls.getPricingUrl()
        ])
        setDashboardUrl(dashboard)
        setPricingUrl(pricing)
      } catch (error) {
        console.error("Failed to load dynamic URLs:", error)
      }
    }
    loadUrls()
  }, [])

  const isApiKey = tokenData.tokenType === TokenType.API_KEY
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

      {/* 状态网格 - shadcn/ui 风格，与乘客消费排行榜保持一致 */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-3 gap-4">
          {/* 认证状态 */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              认证状态
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  isAuthenticated ? "bg-green-500" : "bg-orange-500"
                }`}></div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {isAuthenticated ? (isApiKey ? "API Key" : "JWT") : "未认证"}
              </span>
            </div>
            <div className="min-h-[20px] flex items-center">
              {!isAuthenticated ? (
                <button
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  onClick={() =>
                    dashboardUrl && chrome.tabs.create({ url: dashboardUrl })
                  }>
                  点击登录 →
                </button>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {isApiKey ? "长期有效" : `${tokenExpiration.formatted}失效`}
                </span>
              )}
            </div>
          </div>

          {/* 购买状态 */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              购买状态
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  purchaseLoading
                    ? "bg-gray-400 animate-pulse"
                    : purchaseAvailable
                      ? "bg-blue-500"
                      : "bg-gray-400"
                }`}></div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {purchaseLoading
                  ? "检查中"
                  : purchaseAvailable
                    ? "购买开放"
                    : "购买暂停"}
              </span>
            </div>
            <div className="min-h-[20px] flex items-center">
              {purchaseAvailable ? (
                <button
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  onClick={() =>
                    pricingUrl && chrome.tabs.create({ url: pricingUrl })
                  }>
                  立即购买 →
                </button>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {purchaseLoading ? "获取状态中..." : "等待下次开放"}
                </span>
              )}
            </div>
          </div>

          {/* Opus 状态 */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Opus 状态
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  opusLoading
                    ? "bg-gray-400 animate-pulse"
                    : opusEnabled
                      ? "bg-purple-500"
                      : "bg-gray-400"
                }`}></div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {opusLoading
                  ? "检查中"
                  : opusEnabled
                    ? "Opus 开启"
                    : "Opus 关闭"}
              </span>
            </div>
            <div className="min-h-[20px] flex items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
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
