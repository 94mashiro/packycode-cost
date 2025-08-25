import { useState } from "react"

import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"

const logger = loggers.ui

interface LogoutSectionProps {
  onLogout?: () => void
}

export function LogoutSection({ onLogout }: LogoutSectionProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      logger.info("用户发起登出操作")

      const storageManager = await getStorageManager()

      // 并发清空所有存储数据
      await Promise.all([
        storageManager.remove(StorageDomain.AUTH),
        storageManager.remove(StorageDomain.USER_INFO),
        storageManager.remove(StorageDomain.PURCHASE_CONFIG),
        storageManager.remove(StorageDomain.SYSTEM_PREFERENCE)
      ])

      logger.debug(
        "已清空所有认证和用户数据：认证信息、用户信息、购买配置、系统偏好"
      )

      logger.info("登出成功，所有认证数据已清空")

      // 通知父组件
      onLogout?.()
    } catch (error) {
      logger.error("登出失败:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            账号管理
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            如果遇到问题，可以尝试登出并重新登录
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
          disabled={isLoggingOut}
          onClick={handleLogout}>
          {isLoggingOut ? "登出中..." : "登出"}
        </button>
      </div>
    </div>
  )
}
