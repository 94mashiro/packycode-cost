import { useCallback, useEffect, useState } from "react"

import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain, type StorageDomainMap } from "~/lib/storage/domains"

const logger = loggers.ui

/**
 * 通用存储 Hook
 *
 * 特性:
 * 1. 类型安全 - 根据存储域自动推导数据类型
 * 2. 响应式 - 监听目标域和版本变化，自动重新加载数据
 * 3. 错误处理 - 统一的错误状态管理
 * 4. 性能优化 - 避免不必要的重新渲染和重复监听
 *
 * 版本感知机制:
 * - 对于版本化域（如USER_INFO），同时监听目标域和USER_PREFERENCE变化
 * - 当账号版本切换时，自动refresh以获取新版本的数据
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

  // 刷新数据
  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const storage = getStorageManager()
      const result = await storage.get<StorageDomainMap[T]>(domain)

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

        const storage = getStorageManager()
        await storage.set(domain, value, true) // 使用强制覆盖模式，确保完全替换

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
    [domain]
  )

  // 初始化和监听设置
  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      try {
        logger.debug(`🔧 useStorage initializing for domain: ${domain}`)

        // 初始化加载数据
        await refresh()
        logger.debug(`✅ useStorage initial refresh completed for: ${domain}`)

        if (mounted) {
          const storage = getStorageManager()
          logger.debug(
            `📊 useStorage setting up StorageManager watch for domain: ${domain}`
          )

          // ✅ 使用 StorageManager 的版本感知 watch
          // 1. 监听目标域数据变化
          storage.watch({
            [domain]: () => {
              if (mounted) {
                logger.debug(
                  `📝 [useStorage] Domain data changed, refreshing: ${domain}`
                )
                refresh()
              }
            }
          })

          // 2. 监听账号切换事件（v3.5.2+ 新增）
          // 当账号切换时，自动刷新数据以获取新账号的数据
          storage.getUnderlyingStorage().watch({
            [StorageDomain.ACCOUNT_REGISTRY]: () => {
              if (mounted) {
                logger.debug(
                  `🔄 [useStorage] Account switched, refreshing: ${domain}`
                )
                refresh()
              }
            }
          })

          const watchDescription = `${domain} + ACCOUNT_REGISTRY`

          logger.debug(
            `🔗 useStorage watch registered for: ${watchDescription}`
          )
        }
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
      // Plasmo Storage 会自动清理 watch（当组件卸载时）
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
