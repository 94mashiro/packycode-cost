import { useCallback, useEffect, useState } from "react"

import { AccountManager } from "~/lib/account"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain, type StorageDomainMap } from "~/lib/storage/domains"

const logger = loggers.ui

/**
 * 通用存储 Hook (显式 accountId 版本)
 *
 * 特性:
 * 1. 类型安全 - 根据存储域自动推导数据类型
 * 2. 响应式 - 监听当前账号数据变化和账号切换事件
 * 3. 错误处理 - 统一的错误状态管理
 * 4. 性能优化 - 避免不必要的重新渲染和重复监听
 *
 * 账号切换机制:
 * - 监听 ACCOUNT_REGISTRY 变化，自动切换到新账号并重新加载数据
 * - 为当前账号设置数据监听，数据变化时自动刷新
 *
 * @param domain 存储域 (使用 StorageDomain 枚举)
 * @returns 类型安全的存储数据和操作函数
 */
export function useStorage<T extends keyof StorageDomainMap>(
  domain: T
): {
  data: null | StorageDomainMap[T]
  error: null | string
  loading: boolean
  refresh: () => Promise<void>
  update: (value: StorageDomainMap[T]) => Promise<void>
} {
  // 状态管理
  const [data, setData] = useState<null | StorageDomainMap[T]>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<null | string>(null)
  const [currentAccountId, setCurrentAccountId] = useState<null | string>(null)

  // 刷新数据
  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const storage = getStorageManager()
      const accountManager = new AccountManager(storage)
      const currentAccount = await accountManager.getCurrentAccount()

      if (!currentAccount) {
        logger.debug(`useStorage: No active account, returning null for ${domain}`)
        setData(null)
        setCurrentAccountId(null)
        setLoading(false)
        return
      }

      setCurrentAccountId(currentAccount.id)
      const result = await storage.get<StorageDomainMap[T]>(
        currentAccount.id,
        domain
      )

      setData(result)
      logger.debug(`useStorage refresh: ${domain}`, result ? "loaded" : "null")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      logger.error(`useStorage refresh error: ${domain}`, err)
    } finally {
      setLoading(false)
    }
  }, [domain])

  // 更新数据
  const update = useCallback(
    async (value: StorageDomainMap[T]) => {
      try {
        setError(null)

        if (!currentAccountId) {
          throw new Error("No active account to update")
        }

        const storage = getStorageManager()
        await storage.set(currentAccountId, domain, value, true) // 使用强制覆盖模式

        setData(value)
        logger.debug(`useStorage update: ${domain}`)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update"
        setError(errorMessage)
        logger.error(`useStorage update error: ${domain}`, err)
        throw err // 重新抛出，让调用者处理
      }
    },
    [domain, currentAccountId]
  )

  // 初始化和监听设置
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        logger.debug(`🔧 useStorage initializing for domain: ${domain}`)

        // 初始化加载数据
        await refresh()

        if (!mounted) return

        const storage = getStorageManager()
        const accountManager = new AccountManager(storage)
        const currentAccount = await accountManager.getCurrentAccount()

        if (!currentAccount) {
          logger.debug(`⚠️ useStorage: No active account for ${domain}`)
          return
        }

        logger.debug(
          `📊 useStorage setting up watch for account ${currentAccount.id}, domain: ${domain}`
        )

        // 1. 监听当前账号的数据变化
        storage.watch(currentAccount.id, {
          [domain]: () => {
            if (mounted) {
              logger.debug(
                `📝 [useStorage] Data changed for ${currentAccount.id}.${domain}, refreshing`
              )
              refresh()
            }
          }
        })

        // 2. 监听账号切换事件
        storage.getUnderlyingStorage().watch({
          [StorageDomain.ACCOUNT_REGISTRY]: () => {
            if (mounted) {
              logger.debug(
                `🔄 [useStorage] Account switched, refreshing ${domain}`
              )
              refresh()
            }
          }
        })

        logger.debug(`🔗 useStorage watch registered for: ${domain}`)
      } catch (err) {
        logger.error(`❌ useStorage initialization error: ${domain}`, err)
        if (mounted) {
          setError("Initialization failed")
          setLoading(false)
        }
      }
    }

    initialize()

    // 清理函数
    return () => {
      logger.debug(`🧹 useStorage cleanup for domain: ${domain}`)
      mounted = false
      logger.debug(`✅ useStorage cleanup completed for domain: ${domain}`)
    }
  }, [domain, refresh])

  return {
    data,
    error,
    loading,
    refresh,
    update
  }
}
