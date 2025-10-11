import { useEffect, useState } from "react"

import { AccountManager } from "../lib/account"
import { getMultiAccountStorageManager } from "../lib/storage"
import { executeAllTasks } from "../modules/tasks"
import type { Account } from "../types"
import { PackySite } from "../types/account"

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
  const [currentSite, setCurrentSite] = useState<PackySite>(PackySite.WWW)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 加载当前账号和所有账号列表
  useEffect(() => {
    const loadAccountData = async () => {
      try {
        const storageManager = getMultiAccountStorageManager()
        const accountManager = new AccountManager(storageManager)

        const [currentAccount, allAccounts] = await Promise.all([
          accountManager.getCurrentAccount(),
          accountManager.getAllAccounts()
        ])

        setCurrentSite(currentAccount?.site ?? PackySite.WWW)
        setAccounts(allAccounts)
      } catch (error) {
        console.error("Failed to load account data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAccountData()
  }, [])

  // 检查站点是否有账号
  const hasAccountForSite = (site: PackySite): boolean => {
    return accounts.some((acc) => acc.site === site)
  }

  // 获取站点名称
  const getSiteName = (site: PackySite): string => {
    const siteNames: Record<PackySite, string> = {
      [PackySite.WWW]: "公交车",
      [PackySite.SHARED]: "滴滴车",
      [PackySite.CODEX]: "Codex"
    }
    return siteNames[site]
  }

  // 切换到目标站点的第一个账号
  const handleSiteChange = async (targetSite: PackySite) => {
    if (targetSite === currentSite) return

    setIsLoading(true)
    try {
      // 1. 查找目标站点的第一个账号
      const targetAccount = accounts.find((acc) => acc.site === targetSite)

      if (!targetAccount) {
        if (showNotification) {
          chrome.notifications.create({
            iconUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
            message: `暂无${getSiteName(targetSite)}账号，请先添加`,
            title: "切换失败",
            type: "basic"
          })
        }
        return
      }

      // 2. 切换账号
      const storageManager = getMultiAccountStorageManager()
      const accountManager = new AccountManager(storageManager)
      await accountManager.switchAccount(targetAccount.id)

      setCurrentSite(targetSite)

      if (showNotification) {
        chrome.notifications.create({
          iconUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
          message: `已切换到${getSiteName(targetSite)}模式`,
          title: "账号已切换",
          type: "basic"
        })
      }

      // 3. 刷新数据
      await executeAllTasks()

      // 4. 通知父组件
      if (onAccountChanged) {
        onAccountChanged()
      }
    } catch (error) {
      console.error("Failed to switch account:", error)
      if (showNotification) {
        chrome.notifications.create({
          iconUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
          message: "账号切换失败，请重试",
          title: "切换失败",
          type: "basic"
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSite = e.target.value as PackySite
    handleSiteChange(newSite)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        htmlFor="account-site">
        账号站点
      </label>
      <select
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        disabled={isLoading}
        id="account-site"
        onChange={handleDropdownChange}
        value={currentSite}>
        <option
          disabled={!hasAccountForSite(PackySite.WWW)}
          value={PackySite.WWW}>
          Claude Code 公交车 {!hasAccountForSite(PackySite.WWW) && "(无账号)"}
        </option>
        <option
          disabled={!hasAccountForSite(PackySite.SHARED)}
          value={PackySite.SHARED}>
          Claude Code 滴滴车 {!hasAccountForSite(PackySite.SHARED) && "(无账号)"}
        </option>
        <option
          disabled={!hasAccountForSite(PackySite.CODEX)}
          value={PackySite.CODEX}>
          Codex {!hasAccountForSite(PackySite.CODEX) && "(无账号)"}
        </option>
      </select>
    </div>
  )
}
