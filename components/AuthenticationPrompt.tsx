import { useEffect, useState } from "react"

import { apiUrls } from "../api"
import { AccountManager } from "../lib/account/AccountManager"
import { loggers } from "../lib/logger"
import { getStorageManager } from "../lib/storage"
import { type TokenData, type TokenExpiration, TokenType } from "../types"
import { PackySite } from "../types/account"

const logger = loggers.ui

interface AuthenticationPromptProps {
  tokenData: TokenData
  tokenExpiration: TokenExpiration
}

export function AuthenticationPrompt({
  tokenData,
  tokenExpiration
}: AuthenticationPromptProps) {
  const [dashboardUrl, setDashboardUrl] = useState<string>("")

  useEffect(() => {
    const loadUrl = async () => {
      try {
        // 获取当前账号的站点
        const accountManager = new AccountManager(getStorageManager())
        const currentAccount = await accountManager.getCurrentAccount()
        const site = currentAccount?.site ?? PackySite.WWW
        
        const url = apiUrls.getDashboardUrl(site)
        setDashboardUrl(url)
      } catch (error) {
        logger.error("Failed to load dashboard URL:", error)
      }
    }
    loadUrl()
  }, [])

  const isApiKey = tokenData.tokenType === TokenType.API_KEY

  // API Key不需要检查过期，只要isValid就显示正常
  if (tokenData.isValid && (isApiKey || !tokenExpiration.isExpired)) {
    return null
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
      <div className="space-y-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {!tokenData.isValid
            ? "请先访问 packycode.com 登录以获取会话信息"
            : "登录态已过期，请重新登录"}
        </p>
        <button
          className="w-full rounded-md bg-yellow-600 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors dark:bg-yellow-700 dark:hover:bg-yellow-600"
          onClick={() =>
            dashboardUrl && chrome.tabs.create({ url: dashboardUrl })
          }>
          {!tokenData.isValid ? "前往登录" : "重新登录"}
        </button>
      </div>
    </div>
  )
}
