import { useCallback, useEffect, useState } from "react"

import type { StorageDomainMap } from "~/lib/storage/domains"

import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"

const logger = loggers.ui

/**
 * 通用存储 Hook
 *
 * 特性:
 * 1. 类型安全 - 根据存储域自动推导数据类型
 * 2. 响应式 - 版本切换时自动重新加载数据
 * 3. 错误处理 - 统一的错误状态管理
 * 4. 性能优化 - 避免不必要的重新渲染
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

      const storage = await getStorageManager()
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

        const storage = await getStorageManager()
        await storage.set(domain, value)

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

  // 初始化和版本变化监听
  useEffect(() => {
    let mounted = true
    let unsubscribeVersionChange: (() => void) | null = null

    const initialize = async () => {
      try {
        // 初始化加载数据
        await refresh()

        // 监听版本变化
        if (mounted) {
          const storage = await getStorageManager()
          unsubscribeVersionChange = storage.onVersionChange(() => {
            if (mounted) {
              logger.debug(`Version changed, refreshing data for: ${domain}`)
              refresh()
            }
          })
        }
      } catch (err) {
        logger.error(`useStorage initialization error: ${domain}`, err)
        if (mounted) {
          setError("Initialization failed")
          setLoading(false)
        }
      }
    }

    initialize()

    // 清理函数
    return () => {
      mounted = false
      if (unsubscribeVersionChange) {
        unsubscribeVersionChange()
      }
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
