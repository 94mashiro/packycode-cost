import "./reset.css"

import eruda from "eruda"
import { useEffect, useState } from "react"

import { getTokenExpiration } from "~/modules/auth"
import { SubscriptionDisplay } from "~/modules/subscription"
import { fetchAllDataAsync } from "~/modules/tasks"

import { ActionButtons } from "./components/ActionButtons"
import { BudgetDisplay } from "./components/budget"
import { CombinedStatus } from "./components/CombinedStatus"
import { PeerSpendingChart } from "./components/PeerSpendingChart"
import { RefreshButton } from "./components/RefreshButton"
import { SettingsPage } from "./components/SettingsPage"
import { VersionInfo } from "./components/VersionInfo"
import { useAuth } from "./hooks"
import { useTaskExecution } from "./hooks/useTaskExecution"
import { enablePopupLogging } from "./lib/logger"
import { TokenType, ViewType } from "./types"

// 启用 Popup 日志接收
enablePopupLogging()

// 在开发环境中启用 Eruda 调试工具
if (process.env.NODE_ENV === "development") {
  eruda.init()
}

function IndexPopup() {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.MAIN)
  const { data: authData } = useAuth()
  const { executeAll, loading: taskLoading } = useTaskExecution()

  const tokenExpiration = authData?.token
    ? getTokenExpiration(authData.token)
    : null
  const isTokenValid = !!(authData?.token && authData?.type)

  const handleRefresh = () => {
    if (isTokenValid) {
      // 使用新的任务执行 Hook
      executeAll()
    }
  }

  useEffect(() => {
    // popup打开时立即触发所有数据获取任务
    fetchAllDataAsync()
  }, [])

  // 设置页面
  if (currentView === ViewType.SETTINGS) {
    return (
      <div className="w-[460px] bg-white dark:bg-gray-900">
        <SettingsPage
          onBack={() => setCurrentView(ViewType.MAIN)}
          onRefresh={handleRefresh}
        />
      </div>
    )
  }

  // 主页面
  return (
    <div className="w-[460px] bg-white dark:bg-gray-900">
      <div className="flex flex-col space-y-6 p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">主面板</h2>
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
                isVisible={isTokenValid}
                loading={taskLoading}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        </div>

        <CombinedStatus
          tokenData={{
            expiry: null,
            isValid: isTokenValid || false,
            token: authData?.token || null,
            tokenType: authData?.type || null
          }}
          tokenExpiration={
            tokenExpiration || { exp: 0, formatted: "", isExpired: true }
          }
        />

        {/* 预算信息组件 - 独立显示，只依赖认证状态 */}
        {isTokenValid &&
          (authData?.type === TokenType.API_KEY ||
            !tokenExpiration?.isExpired) && <BudgetDisplay />}

        {/* 套餐信息组件 - 独立显示，只依赖认证状态 */}
        {isTokenValid &&
          (authData?.type === TokenType.API_KEY ||
            !tokenExpiration?.isExpired) && <SubscriptionDisplay />}

        {/* 乘客消费排行榜 - 滴滴车模式专属 */}
        {isTokenValid &&
          (authData?.type === TokenType.API_KEY ||
            !tokenExpiration?.isExpired) && <PeerSpendingChart />}

        <ActionButtons />

        <VersionInfo />
      </div>
    </div>
  )
}

export default IndexPopup
