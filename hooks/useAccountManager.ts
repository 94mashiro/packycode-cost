/**
 * useAccountManager - 账号管理 Hook
 *
 * 提供账号管理的核心功能：
 * 1. 账号列表获取和管理
 * 2. 账号切换
 * 3. 账号添加/删除
 * 4. 当前激活账号状态
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "保持 Hook 简单，复杂逻辑交给 AccountManager"
 * ⚛️ Dan: "React Hook 最佳实践，清晰的状态管理"
 * ☕ Bloch: "类型安全的 API 设计"
 * 🏛️ Fowler: "展示层与业务层分离"
 */

import { useCallback, useEffect, useState } from "react"

import type { Account, AddAccountConfig, UpdateAccountConfig } from "~/types"

import { loggers } from "~/lib/logger"
import { PackySite } from "~/types/account"

import { AccountManager } from "../lib/account"
import { getStorageManager } from "../lib/storage"
import { StorageDomain } from "../lib/storage/domains"

const logger = loggers.ui

/**
 * 账号管理 Hook
 *
 * @param site 账号站点（可选）。如果提供，则只返回该站点的账号；如果不提供，返回所有账号
 *
 * @example
 * ```typescript
 * // 获取特定站点的账号
 * const { accounts } = useAccountManager(PackySite.WWW)
 *
 * // 获取所有账号（跨站点）
 * const { accounts } = useAccountManager()
 * ```
 */
export function useAccountManager(site?: PackySite) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<null | string>(null)

  // 创建 AccountManager 实例
  const getManager = useCallback(() => {
    const storageManager = getStorageManager()
    return new AccountManager(storageManager)
  }, [])

  /**
   * 加载账号列表
   */
  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const manager = getManager()

      // 获取所有账号
      const allAccounts = await manager.getAllAccounts()

      // 根据 site 参数决定是否过滤
      const filteredAccounts = site
        ? allAccounts.filter((acc) => acc.site === site)
        : allAccounts

      setAccounts(filteredAccounts)

      // 页面不再展示邮箱/预算等聚合数据

      // 获取当前激活账号
      if (site) {
        // 特定站点的当前账号：找到该站点中激活的账号
        const siteAccounts = filteredAccounts.filter((acc) => acc.site === site)
        const current = siteAccounts.find((acc) => acc.isActive) || null
        setCurrentAccount(current)
      } else {
        // 全局当前账号：直接调用 getCurrentAccount()
        const current = await manager.getCurrentAccount()
        setCurrentAccount(current)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      logger.error("Failed to load accounts:", err)
    } finally {
      setLoading(false)
    }
  }, [site, getManager])

  /**
   * 添加新账号
   */
  const addAccount = useCallback(
    async (config: AddAccountConfig): Promise<string> => {
      try {
        const manager = getManager()
        const accountId = await manager.addAccount(config)

        // 刷新账号列表
        await loadAccounts()

        return accountId
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to add account"
        setError(errorMessage)
        throw err
      }
    },
    [getManager, loadAccounts]
  )

  /**
   * 删除账号
   */
  const removeAccount = useCallback(
    async (accountId: string): Promise<void> => {
      try {
        const manager = getManager()
        await manager.removeAccount(accountId)

        // 刷新账号列表
        await loadAccounts()
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to remove account"
        setError(errorMessage)
        throw err
      }
    },
    [getManager, loadAccounts]
  )

  /**
   * 切换账号
   */
  const switchAccount = useCallback(
    async (accountId: string): Promise<void> => {
      try {
        const manager = getManager()
        await manager.switchAccount(accountId)

        // 刷新账号列表和当前账号
        await loadAccounts()
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to switch account"
        setError(errorMessage)
        throw err
      }
    },
    [getManager, loadAccounts]
  )

  /**
   * 更新账号信息
   */
  const updateAccount = useCallback(
    async (accountId: string, updates: UpdateAccountConfig): Promise<void> => {
      try {
        const manager = getManager()
        await manager.updateAccount(accountId, updates)

        // 刷新账号列表
        await loadAccounts()
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update account"
        setError(errorMessage)
        throw err
      }
    },
    [getManager, loadAccounts]
  )

  /**
   * 刷新账号列表
   */
  const refreshAccounts = useCallback(async () => {
    await loadAccounts()
  }, [loadAccounts])

  // 初始加载
  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  // 监听账号注册表变化
  // 当其他组件切换账号时，自动重新加载账号列表
  useEffect(() => {
    const storage = getStorageManager().getUnderlyingStorage()

    storage.watch({
      [StorageDomain.ACCOUNT_REGISTRY]: () => {
        logger.debug(
          "🔄 [useAccountManager] Account registry changed, reloading accounts"
        )
        loadAccounts()
      }
    })

    logger.debug("🔗 [useAccountManager] Watch registered for ACCOUNT_REGISTRY")
  }, [loadAccounts])

  return {
    // 账号数据
    accounts,
    // 操作方法
    addAccount,

    currentAccount,
    // 状态
    error,

    loading,
    refreshAccounts,
    removeAccount,
    switchAccount,
    updateAccount
  }
}
