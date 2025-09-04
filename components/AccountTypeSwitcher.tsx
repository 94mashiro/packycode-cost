import { useEffect, useState } from "react"

import { getStorageManager } from "../lib/storage"
import { StorageDomain } from "../lib/storage/domains"
import { AccountVersion, type UserPreferenceStorage } from "../types"

interface AccountTypeSwitcherProps {
  className?: string
  onAccountChanged?: () => void
  showNotification?: boolean
}

export function AccountTypeSwitcher({
  className = "",
  onAccountChanged,
  showNotification = true
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
          iconUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
          message: `已切换到${newType === AccountVersion.PRIVATE ? "滴滴车" : newType === AccountVersion.CODEX_SHARED ? "CodeX公交车" : "公交车"}模式`,
          title: "账号类型已切换",
          type: "basic"
        })
      }

      // 账户切换成功后立即刷新数据
      if (onAccountChanged) {
        onAccountChanged()
      }
    } catch (error) {
      console.error("Failed to switch account type:", error)
      if (showNotification) {
        chrome.notifications.create({
          iconUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
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
        <option value={AccountVersion.SHARED}>Claude Code 公交车</option>
        <option value={AccountVersion.PRIVATE}>Claude Code 滴滴车</option>
        <option value={AccountVersion.CODEX_SHARED}>Codex</option>
      </select>
    </div>
  )
}
