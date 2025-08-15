import "./reset.css"

import { useEffect } from "react"

import { ActionButtons } from "./components/ActionButtons"
import { BudgetResetCountdown } from "./components/BudgetResetCountdown"
import { CombinedStatus } from "./components/CombinedStatus"
import { ProgressBar } from "./components/ProgressBar"
import { RefreshButton } from "./components/RefreshButton"
import { VersionInfo } from "./components/VersionInfo"
import { usePackyToken } from "./hooks/usePackyToken"
import { useUserInfo } from "./hooks/useUserInfo"
import { getTokenExpiration } from "./utils/jwt"
import { checkPurchaseStatus } from "./utils/purchaseStatusChecker"

function IndexPopup() {
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

  return (
    <div className="h-[600px] w-[400px] m-0 p-0 overflow-hidden bg-white dark:bg-gray-900">
      <div className="h-full w-full overflow-y-auto">
        <div className="flex flex-col space-y-6 p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">额度查询</h2>
              <RefreshButton
                isVisible={tokenData.isValid}
                loading={loading}
                onRefresh={handleRefresh}
              />
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
            (tokenData.tokenType === "api_key" ||
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
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
                        </div>
                        <div className="overflow-hidden rounded-full bg-gray-200 h-2 dark:bg-gray-700">
                          <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-1/3"></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-24"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-16"></div>
                        </div>
                        <div className="overflow-hidden rounded-full bg-gray-200 h-2 dark:bg-gray-700">
                          <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse w-2/3"></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-12"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {userInfo && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <ProgressBar
                        budget={userInfo.daily_budget_usd}
                        spent={userInfo.daily_spent_usd}
                        title="日预算使用情况"
                      />
                      <BudgetResetCountdown className="mt-4" />
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <ProgressBar
                        budget={userInfo.monthly_budget_usd}
                        spent={userInfo.monthly_spent_usd}
                        title="月预算使用情况"
                      />
                    </div>
                  </div>
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
