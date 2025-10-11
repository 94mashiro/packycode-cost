/**
 * AccountSwitcher - 多账号切换组件（使用 shadcn/ui）
 *
 * 功能：
 * 1. 显示所有账号（跨类型）
 * 2. 支持快速切换账号
 * 3. 显示账号关键信息（名称、类型、消费）
 * 4. 切换成功通知
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "简单直接的用户交互，不要复杂化"
 * ⚛️ Dan: "清晰的状态反馈和加载提示，使用现代 UI 组件"
 * ☕ Bloch: "类型安全的组件设计"
 * 🏛️ Fowler: "关注点分离，UI 与业务逻辑解耦"
 *
 * @since v3.1.0 - 原生 select 实现
 * @since v3.2.0 - 升级为 shadcn/ui Select 组件
 */

import { useCallback, useEffect, useState } from "react"

import { Label } from "@/components/shadcn/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/shadcn/select"
import { useAccountManager } from "@/hooks/useAccountManager"
import { PackySite } from "~/types/account"

interface AccountSwitcherProps {
  className?: string
  onAccountChanged?: () => void
  showNotification?: boolean
}

export function AccountSwitcher({
  className = "",
  onAccountChanged,
  showNotification = true
}: AccountSwitcherProps) {
  const {
    accountDataMap,
    accounts,
    currentAccount,
    error,
    loading,
    switchAccount
  } = useAccountManager() // 不传参数，获取所有账号

  const [isSwitching, setIsSwitching] = useState(false)

  // 当前选中的账号 ID
  const currentAccountId = currentAccount?.id || ""

  const handleAccountChange = useCallback(
    async (newAccountId: string) => {
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
              newAccount.site,
              accountDataMap[newAccountId]?.snapshot
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
      accountDataMap,
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
        <Label>当前账号</Label>
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          暂无账号，请前往设置添加
        </div>
      </div>
    )
  }

  const isDisabled = loading || isSwitching || accounts.length === 0

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="current-account">当前账号</Label>
      <Select
        disabled={isDisabled}
        onValueChange={handleAccountChange}
        value={currentAccountId}>
        <SelectTrigger className="w-full" id="current-account">
          <SelectValue placeholder="选择账号" />
        </SelectTrigger>
        <SelectContent>
          {accounts.length === 0 ? (
            <SelectItem disabled value="empty">
              暂无账号
            </SelectItem>
          ) : (
            accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {formatAccountDisplay(
                  account.displayName,
                  account.site,
                  accountDataMap[account.id]?.snapshot
                )}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * 格式化账号显示文本
 */
function formatAccountDisplay(
  displayName: string,
  site: PackySite,
  snapshot?: {
    dailyLimit: number
    dailySpent: number
  }
): string {
  const siteName = getSiteName(site)
  const baseText = `${displayName} (${siteName})`

  if (snapshot) {
    const spent = snapshot.dailySpent.toFixed(2)
    const limit = snapshot.dailyLimit.toFixed(2)
    return `${baseText} - $${spent}/$${limit}`
  }

  return baseText
}

/**
 * 获取站点的友好显示名称
 */
function getSiteName(site: PackySite): string {
  const siteNames: Record<PackySite, string> = {
    [PackySite.CODEX]: "Codex",
    [PackySite.SHARED]: "滴滴车",
    [PackySite.WWW]: "公交车"
  }
  return siteNames[site]
}
