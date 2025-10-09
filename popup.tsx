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
import { SettingsButton } from "./components/SettingsButton"
import { SettingsPage } from "./components/SettingsPage"
import { VersionInfo } from "./components/VersionInfo"
import { useAuth, useUserPreference } from "./hooks"
import { useTaskExecution } from "./hooks/useTaskExecution"
import { enablePopupLogging } from "./lib/logger"
import { AccountVersion, TokenType, ViewType } from "./types"

// 启用 Popup 日志接收
enablePopupLogging()

// 在开发环境中启用 Eruda 调试工具
if (process.env.NODE_ENV === "development") {
  eruda.init()
}

function IndexPopup() {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.MAIN)
  const { data: authData } = useAuth()
  const { data: userPreference } = useUserPreference()
  const { executeAll, loading: taskLoading } = useTaskExecution()

  const tokenExpiration = authData?.token
    ? getTokenExpiration(authData.token)
    : null
  const isTokenValid = !!(authData?.token && authData?.type)

  // Token 时效性检查：API Key 永久有效，JWT 需要检查过期时间
  const isTokenEffective =
    authData?.type === TokenType.API_KEY
      ? true // API Key 永久有效
      : !tokenExpiration?.isExpired // JWT 需检查过期

  // 完整的认证有效性：Token 存在且未过期
  const isAuthenticated = isTokenValid && isTokenEffective

  const currentAccountType =
    userPreference?.account_version ?? AccountVersion.SHARED

  const handleRefresh = () => {
    if (isAuthenticated) {
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
              <SettingsButton
                onClick={() => setCurrentView(ViewType.SETTINGS)}
              />
              <RefreshButton
                isVisible={isAuthenticated}
                loading={taskLoading}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        </div>

        <CombinedStatus
          tokenData={{
            expiry: null,
            isValid: isAuthenticated || false,
            token: authData?.token || null,
            tokenType: authData?.type || null
          }}
          tokenExpiration={
            tokenExpiration || { exp: 0, formatted: "", isExpired: true }
          }
        />

        {/* 认证门禁：所有需要 API 访问凭证的组件都在此条件内 */}
        {isAuthenticated && (
          <>
            {/* 预算信息 */}
            <BudgetDisplay />

            {/* 套餐信息 - 仅 CODEX_SHARED 和 PRIVATE 模式展示 */}
            {currentAccountType !== AccountVersion.SHARED && (
              <SubscriptionDisplay />
            )}

            {/* 乘客消费排行榜 - 仅 PRIVATE（滴滴车）模式展示 */}
            {currentAccountType === AccountVersion.PRIVATE && (
              <PeerSpendingChart />
            )}
          </>
        )}

        <ActionButtons />

        <VersionInfo />
      </div>
    </div>
  )
}

export default IndexPopup
