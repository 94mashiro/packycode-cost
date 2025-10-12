/**
 * AccountSwitcher - 多账号切换组件（原生 select 元素）
 *
 * 功能：
 * 1. 显示所有账号（跨类型）
 * 2. 支持快速切换账号
 * 3. 显示账号关键信息（名称、类型）
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "简单直接的用户交互，不要复杂化"
 * ⚛️ Dan: "清晰的状态反馈和加载提示，使用现代 UI 组件"
 * ☕ Bloch: "类型安全的组件设计"
 * 🏛️ Fowler: "关注点分离，UI 与业务逻辑解耦"
 */

import { useCallback, useEffect, useState } from "react"

import { Label } from "@/components/shadcn/label"
import { useAccountManager } from "@/hooks/useAccountManager"
import { loggers } from "~/lib/logger"
import { PackySite } from "~/types/account"
import { getSiteName } from "~/utils/siteHelpers"

const logger = loggers.ui

interface AccountSwitcherProps {
  className?: string
  onAccountChanged?: () => void
}

export function AccountSwitcher({
  className = "",
  onAccountChanged
}: AccountSwitcherProps) {
  const { accounts, currentAccount, error, loading, switchAccount } =
    useAccountManager() // 不传参数，获取所有账号

  const [isSwitching, setIsSwitching] = useState(false)

  // 当前选中的账号 ID（修复：始终提供有效值以保持 controlled 状态）
  const currentAccountId = currentAccount?.id ?? ""

  const handleAccountChange = useCallback(
    async (newAccountId: string) => {
      if (newAccountId === currentAccountId || !newAccountId) return

      setIsSwitching(true)
      try {
        await switchAccount(newAccountId)

        // 触发数据刷新
        if (onAccountChanged) {
          onAccountChanged()
        }
      } catch (err) {
        logger.error("Failed to switch account:", err)
      } finally {
        setIsSwitching(false)
      }
    },
    [currentAccountId, onAccountChanged, switchAccount]
  )

  // 自动切换逻辑：如果有账号但没有激活账号，自动切换到第一个
  useEffect(() => {
    if (!loading && !currentAccount && accounts.length > 0 && !isSwitching) {
      logger.debug(
        "No active account found, auto-switching to first account:",
        accounts[0].id
      )
      handleAccountChange(accounts[0].id)
    }
  }, [loading, currentAccount, accounts, isSwitching, handleAccountChange])

  // 错误提示
  useEffect(() => {
    if (error) {
      logger.error("AccountSwitcher error:", error)
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

  // Loading 状态或正在切换时显示占位
  if (loading || (accounts.length > 0 && !currentAccountId)) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>当前账号</Label>
        <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          加载中...
        </div>
      </div>
    )
  }

  const isDisabled = isSwitching

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="current-account">当前账号</Label>
      <select
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isDisabled}
        id="current-account"
        onChange={(e) => handleAccountChange(e.target.value)}
        value={currentAccountId}>
        {accounts.length === 0 ? (
          <option disabled value="">
            暂无账号
          </option>
        ) : (
          accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {formatAccountDisplay(account.displayName, account.site)}
            </option>
          ))
        )}
      </select>
    </div>
  )
}

/**
 * 格式化账号显示文本
 */
function formatAccountDisplay(displayName: string, site: PackySite): string {
  const siteName = getSiteName(site)
  const baseText = `${displayName} (${siteName})`
  return baseText
}
