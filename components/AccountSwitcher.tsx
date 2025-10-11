/**
 * AccountSwitcher - 多账号切换组件
 *
 * 功能：
 * 1. 显示所有账号（跨类型）
 * 2. 支持快速切换账号
 * 3. 显示账号关键信息（名称、类型、消费）
 * 4. 切换成功通知
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "简单直接的用户交互，不要复杂化"
 * ⚛️ Dan: "清晰的状态反馈和加载提示"
 * ☕ Bloch: "类型安全的组件设计"
 * 🏛️ Fowler: "关注点分离，UI 与业务逻辑解耦"
 *
 * @since v3.1.0
 */

import { useCallback, useEffect, useState } from "react"

import { useAccountManager } from "../hooks/useAccountManager"
import { AccountVersion } from "../types"

interface AccountSwitcherProps {
  className?: string
  onAccountChanged?: () => void
  showNotification?: boolean
}

/**
 * 获取账号类型的友好显示名称
 */
function getAccountTypeName(type: AccountVersion): string {
  const typeNames: Record<AccountVersion, string> = {
    [AccountVersion.CODEX_SHARED]: "Codex",
    [AccountVersion.PRIVATE]: "滴滴车",
    [AccountVersion.SHARED]: "公交车"
  }
  return typeNames[type]
}

/**
 * 格式化账号显示文本
 */
function formatAccountDisplay(
  displayName: string,
  type: AccountVersion,
  snapshot?: {
    dailyLimit: number
    dailySpent: number
  }
): string {
  const typeName = getAccountTypeName(type)
  const baseText = `${displayName} (${typeName})`

  if (snapshot) {
    const spent = snapshot.dailySpent.toFixed(2)
    const limit = snapshot.dailyLimit.toFixed(2)
    return `${baseText} - $${spent}/$${limit}`
  }

  return baseText
}

export function AccountSwitcher({
  className = "",
  onAccountChanged,
  showNotification = true
}: AccountSwitcherProps) {
  const {
    accounts,
    currentAccount,
    loading,
    error,
    switchAccount
  } = useAccountManager() // 不传参数，获取所有账号

  const [isSwitching, setIsSwitching] = useState(false)

  // 当前选中的账号 ID
  const currentAccountId = currentAccount?.id || ""

  const handleAccountChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newAccountId = e.target.value

      if (newAccountId === currentAccountId || !newAccountId) return

      setIsSwitching(true)
      try {
        await switchAccount(newAccountId)

        const newAccount = accounts.find((acc) => acc.id === newAccountId)
        if (showNotification && newAccount) {
          chrome.notifications.create({
            iconUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
            message: `已切换到账号：${formatAccountDisplay(
              newAccount.displayName,
              newAccount.type,
              newAccount.snapshot
            )}`,
            title: "账号已切换",
            type: "basic"
          })
        }

        // 触发数据刷新
        if (onAccountChanged) {
          onAccountChanged()
        }
      } catch (err) {
        console.error("Failed to switch account:", err)
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
        setIsSwitching(false)
      }
    },
    [
      accounts,
      currentAccountId,
      onAccountChanged,
      showNotification,
      switchAccount
    ]
  )

  // 错误提示
  useEffect(() => {
    if (error) {
      console.error("AccountSwitcher error:", error)
    }
  }, [error])

  // 如果没有账号
  if (!loading && accounts.length === 0) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          当前账号
        </label>
        <div className="text-sm text-gray-500 dark:text-gray-400 py-2 px-3 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600">
          暂无账号，请前往设置添加
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        htmlFor="current-account">
        当前账号
      </label>
      <select
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        disabled={loading || isSwitching || accounts.length === 0}
        id="current-account"
        onChange={handleAccountChange}
        value={currentAccountId}>
        {accounts.length === 0 && <option value="">暂无账号</option>}
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {formatAccountDisplay(
              account.displayName,
              account.type,
              account.snapshot
            )}
          </option>
        ))}
      </select>
    </div>
  )
}
