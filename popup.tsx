import "./reset.css"

import { useEffect, useState } from "react"

import { ActionButtons } from "./components/ActionButtons"
import { CombinedBudget } from "./components/CombinedBudget"
import { CombinedStatus } from "./components/CombinedStatus"
import { RefreshButton } from "./components/RefreshButton"
import { SettingsPage } from "./components/SettingsPage"
import { VersionInfo } from "./components/VersionInfo"
import { usePackyToken } from "./hooks/usePackyToken"
import { useUserInfo } from "./hooks/useUserInfo"
import { TokenType, ViewType } from "./types"
import { getTokenExpiration } from "./utils/jwt"
import { checkPurchaseStatus } from "./utils/purchaseStatusChecker"

function IndexPopup() {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.MAIN)
  const tokenData = usePackyToken()
  const { error, loading, refresh, userInfo } = useUserInfo(tokenData.token)
  const tokenExpiration = getTokenExpiration(tokenData.token)

  const handleRefresh = () => {
    if (tokenData.isValid) {
      refresh()
      // 同时刷新购买状态
      checkPurchaseStatus()
    }
  }

  useEffect(() => {
    // popup打开时立即检查购买状态
    checkPurchaseStatus()
  }, [])

  // 设置页面
  if (currentView === ViewType.SETTINGS) {
    return (
      <div className="h-[600px] w-[400px] m-0 p-0 overflow-hidden bg-white dark:bg-gray-900">
        <div className="h-full w-full overflow-y-auto">
          <SettingsPage onBack={() => setCurrentView(ViewType.MAIN)} />
        </div>
      </div>
    )
  }

  // 主页面
  return (
    <div className="h-[600px] w-[400px] m-0 p-0 overflow-hidden bg-white dark:bg-gray-900">
      <div className="h-full w-full overflow-y-auto">
        <div className="flex flex-col space-y-6 p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">额度查询</h2>
              <div className="flex items-center space-x-2">
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
                  onClick={() => setCurrentView(ViewType.SETTINGS)}
                  title="设置">
                  <svg
                    className="w-4 h-4 text-gray-600 dark:text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                    <path
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </button>
                <RefreshButton
                  isVisible={tokenData.isValid}
                  loading={loading}
                  onRefresh={handleRefresh}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              查询您的API使用额度和预算情况
            </p>
          </div>

          <CombinedStatus
            tokenData={tokenData}
            tokenExpiration={tokenExpiration}
          />

          {tokenData.isValid &&
            (tokenData.tokenType === TokenType.API_KEY ||
              !tokenExpiration.isExpired) && (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      加载失败: {error}
                    </p>
                  </div>
                )}

                {!userInfo && loading && (
                  <div className="bg-gray-50/40 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-20"></div>
                      </div>
                      <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                        <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-1/3"></div>
                      </div>
                    </div>
                    <div className="border-t border-gray-200/60 dark:border-gray-700/50"></div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-20"></div>
                      </div>
                      <div className="overflow-hidden rounded-full bg-gray-200 h-1.5 dark:bg-gray-700">
                        <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-2/3"></div>
                      </div>
                    </div>
                  </div>
                )}

                {userInfo && (
                  <CombinedBudget
                    dailyBudget={userInfo.budgets.daily.limit}
                    dailySpent={userInfo.budgets.daily.spent}
                    monthlyBudget={userInfo.budgets.monthly.limit}
                    monthlySpent={userInfo.budgets.monthly.spent}
                  />
                )}
              </div>
            )}

          <ActionButtons />

          <VersionInfo />
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
