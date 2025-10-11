/**
 * AccountSwitcher - 账号切换器组件
 *
 * 功能：
 * 1. 显示当前账号类型的所有账号
 * 2. 切换激活账号
 * 3. 添加新账号
 * 4. 删除账号
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "简单直观的用户界面"
 * ⚛️ Dan: "React 组件最佳实践，状态驱动 UI"
 * ☕ Bloch: "清晰的组件 API 设计"
 * 🏛️ Fowler: "展示层与业务逻辑分离"
 *
 * @since v3.0.0
 */

import { useState } from "react"

import type { Account, AccountVersion } from "~/types"

import { useAccountManager } from "../hooks/useAccountManager"

interface AccountSwitcherProps {
  accountType: AccountVersion
  onAccountChanged?: (account: Account | null) => void
}

/**
 * 账号切换器
 *
 * @example
 * ```tsx
 * <AccountSwitcher
 *   accountType={AccountVersion.SHARED}
 *   onAccountChanged={(account) => console.log("Switched to:", account)}
 * />
 * ```
 */
export function AccountSwitcher({
  accountType,
  onAccountChanged
}: AccountSwitcherProps) {
  const {
    accounts,
    currentAccount,
    error,
    loading,
    removeAccount,
    switchAccount
  } = useAccountManager(accountType)

  const [isExpanded, setIsExpanded] = useState(false)

  // 处理账号切换
  const handleSwitch = async (accountId: string) => {
    try {
      await switchAccount(accountId)
      setIsExpanded(false)

      // 通知父组件
      const newAccount = accounts.find((acc) => acc.id === accountId)
      onAccountChanged?.(newAccount || null)
    } catch (err) {
      console.error("Failed to switch account:", err)
    }
  }

  // 处理账号删除
  const handleRemove = async (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation() // 防止触发切换

    if (!confirm("确认删除此账号？所有数据将被清除。")) {
      return
    }

    try {
      await removeAccount(accountId)

      // 通知父组件
      onAccountChanged?.(null)
    } catch (err) {
      console.error("Failed to remove account:", err)
    }
  }

  if (loading) {
    return (
      <div className="account-switcher loading">
        <div className="spinner">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="account-switcher error">
        <p className="error-message">加载失败: {error}</p>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="account-switcher empty">
        <p className="empty-message">暂无账号</p>
      </div>
    )
  }

  return (
    <div className="account-switcher">
      {/* 当前账号显示 */}
      <button
        className="current-account"
        onClick={() => setIsExpanded(!isExpanded)}>
        <div className="account-info">
          <span className="account-name">
            {currentAccount?.displayName || "选择账号"}
          </span>
          {currentAccount?.isValid === false && (
            <span className="invalid-badge">无效</span>
          )}
        </div>
        <span className={`expand-icon ${isExpanded ? "expanded" : ""}`}>▼</span>
      </button>

      {/* 账号列表 */}
      {isExpanded && (
        <div className="account-list">
          {accounts.map((account) => (
            <div
              className={`account-item ${
                account.id === currentAccount?.id ? "active" : ""
              }`}
              key={account.id}
              onClick={() => handleSwitch(account.id)}>
              <div className="account-content">
                <span className="account-name">{account.displayName}</span>
                {account.isValid === false && (
                  <span className="invalid-badge">无效</span>
                )}
                {account.snapshot && (
                  <div className="account-snapshot">
                    <span className="daily-spent">
                      今日: ${account.snapshot.dailySpent.toFixed(2)} /{" "}
                      {account.snapshot.dailyLimit}
                    </span>
                  </div>
                )}
              </div>
              <button
                className="remove-button"
                onClick={(e) => handleRemove(account.id, e)}
                title="删除账号">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 样式 */}
      <style jsx>{`
        .account-switcher {
          position: relative;
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        }

        .loading,
        .error,
        .empty {
          padding: 12px;
          text-align: center;
          color: #666;
        }

        .error-message {
          color: #e53e3e;
          font-size: 14px;
        }

        .current-account {
          width: 100%;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .current-account:hover {
          border-color: #cbd5e0;
          background: #f7fafc;
        }

        .account-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .account-name {
          font-size: 14px;
          font-weight: 500;
          color: #2d3748;
        }

        .invalid-badge {
          padding: 2px 6px;
          font-size: 11px;
          background: #fed7d7;
          color: #c53030;
          border-radius: 4px;
        }

        .expand-icon {
          font-size: 12px;
          color: #a0aec0;
          transition: transform 0.2s;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .account-list {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
        }

        .account-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .account-item:hover {
          background: #f7fafc;
        }

        .account-item.active {
          background: #ebf8ff;
        }

        .account-item.active .account-name {
          color: #3182ce;
          font-weight: 600;
        }

        .account-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .account-snapshot {
          font-size: 12px;
          color: #718096;
        }

        .remove-button {
          width: 24px;
          height: 24px;
          border: none;
          background: transparent;
          color: #cbd5e0;
          font-size: 20px;
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-button:hover {
          color: #e53e3e;
        }
      `}</style>
    </div>
  )
}
