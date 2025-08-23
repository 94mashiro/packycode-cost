import { useEffect, useState } from "react"

import { getStorageManager } from "../lib/storage"
import { StorageDomain } from "../lib/storage/domains"
import { AccountVersion, type UserPreferenceStorage } from "../types"

interface AccountTypeSwitcherProps {
  className?: string
  showDescription?: boolean
  showNotification?: boolean
  variant?: "dropdown" | "segmented"
}

export function AccountTypeSwitcher({
  className = "",
  showDescription = true,
  showNotification = true,
  variant = "segmented"
}: AccountTypeSwitcherProps) {
  const [currentAccountType, setCurrentAccountType] = useState<AccountVersion>(
    AccountVersion.SHARED
  )
  const [isLoading, setIsLoading] = useState(true)

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
      })

      setCurrentAccountType(newType)

      if (showNotification) {
        chrome.notifications.create({
          iconUrl: "assets/icon.png",
          message: `已切换到${newType === AccountVersion.PRIVATE ? "私家车" : "公交车"}模式，请重新加载扩展以应用更改`,
          title: "账号类型已切换",
          type: "basic"
        })
      }
    } catch (error) {
      console.error("Failed to switch account type:", error)
      if (showNotification) {
        chrome.notifications.create({
          iconUrl: "assets/icon.png",
          message: "账号类型切换失败，请重试",
          title: "切换失败",
          type: "basic"
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as AccountVersion
    handleAccountTypeChange(newType)
  }

  if (variant === "dropdown") {
    return (
      <div className={`space-y-2 ${className}`}>
        <label
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          htmlFor="account-version">
          账号版本
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
          disabled={isLoading}
          id="account-version"
          onChange={handleDropdownChange}
          value={currentAccountType}>
          <option value={AccountVersion.SHARED}>🚌 公交车</option>
          <option value={AccountVersion.PRIVATE}>🚗 私家车</option>
        </select>
        {showDescription && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {currentAccountType === AccountVersion.SHARED
              ? "公交车版本：共享资源，价格实惠"
              : "私家车版本：独享资源，性能更优"}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={`border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4 ${className}`}>
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
        <div className="relative bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <div className="grid grid-cols-2 relative">
            <div
              className={`absolute top-1 bottom-1 rounded-md bg-white dark:bg-gray-700 shadow-sm transition-transform duration-200 ease-out ${
                currentAccountType === AccountVersion.SHARED
                  ? "left-1 right-1/2"
                  : "left-1/2 right-1"
              }`}
            />
            <button
              className={`relative px-3 py-2 text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md z-10 ${
                currentAccountType === AccountVersion.SHARED
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              disabled={isLoading}
              onClick={() => handleAccountTypeChange(AccountVersion.SHARED)}>
              🚌 公交车
            </button>
            <button
              className={`relative px-3 py-2 text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 rounded-md z-10 ${
                currentAccountType === AccountVersion.PRIVATE
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              disabled={isLoading}
              onClick={() => handleAccountTypeChange(AccountVersion.PRIVATE)}>
              🚗 私家车
            </button>
          </div>
        </div>

        {showDescription && (
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              • <strong>公交车模式：</strong>使用 www.packycode.com（共享账号）
            </p>
            <p>
              • <strong>私家车模式：</strong>使用{" "}
              share.packycode.com（私有账号）
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
