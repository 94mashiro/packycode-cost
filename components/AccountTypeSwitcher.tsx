import { useEffect, useState } from "react"

import { getStorageManager } from "../lib/storage"
import { StorageDomain } from "../lib/storage/domains"
import { AccountVersion, type UserPreferenceStorage } from "../types"

export function AccountTypeSwitcher() {
  const [currentAccountType, setCurrentAccountType] = useState<AccountVersion>(
    AccountVersion.SHARED
  )
  const [isLoading, setIsLoading] = useState(true)

  // 加载当前账号类型
  useEffect(() => {
    const loadAccountType = async () => {
      try {
        const storageManager = await getStorageManager()
        const userPreference = await storageManager.get<UserPreferenceStorage>(
          StorageDomain.USER_PREFERENCE
        )
        setCurrentAccountType(
          userPreference?.account_version ?? AccountVersion.SHARED
        )
      } catch (error) {
        console.error("Failed to load account type:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAccountType()
  }, [])

  const handleAccountTypeChange = async (newType: AccountVersion) => {
    if (newType === currentAccountType) return

    setIsLoading(true)
    try {
      const storageManager = await getStorageManager()
      await storageManager.set(StorageDomain.USER_PREFERENCE, {
        account_version: newType
      } as UserPreferenceStorage)

      setCurrentAccountType(newType)

      // 提示用户重新加载扩展以应用更改
      chrome.notifications.create({
        iconUrl: "assets/icon.png",
        message: `已切换到${newType === AccountVersion.PRIVATE ? "私家车" : "公交车"}模式，请重新加载扩展以应用更改`,
        title: "账号类型已切换",
        type: "basic"
      })
    } catch (error) {
      console.error("Failed to switch account type:", error)
      chrome.notifications.create({
        iconUrl: "assets/icon.png",
        message: "账号类型切换失败，请重试",
        title: "切换失败",
        type: "basic"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center justify-center py-4">
          <div className="w-4 h-4 border border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            加载中...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          账号类型
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {currentAccountType === AccountVersion.PRIVATE ? "私家车" : "公交车"}
          模式
        </span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              currentAccountType === AccountVersion.SHARED
                ? "bg-blue-600 text-white border-blue-600 focus:ring-blue-500"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            }`}
            disabled={isLoading}
            onClick={() => handleAccountTypeChange(AccountVersion.SHARED)}>
            公交车
          </button>

          <button
            className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              currentAccountType === AccountVersion.PRIVATE
                ? "bg-purple-600 text-white border-purple-600 focus:ring-purple-500"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 focus:ring-gray-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            }`}
            disabled={isLoading}
            onClick={() => handleAccountTypeChange(AccountVersion.PRIVATE)}>
            私家车
          </button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>
            • <strong>公交车模式：</strong>使用 www.packycode.com（共享账号）
          </p>
          <p>
            • <strong>私家车模式：</strong>使用 share.packycode.com（私有账号）
          </p>
          <p className="text-orange-600 dark:text-orange-400">
            ⚠️ 切换后需要重新加载扩展并重新登录
          </p>
        </div>
      </div>
    </div>
  )
}
