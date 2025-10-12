/**
 * Peer Spending Hook
 *
 * 设计原则 (四师协作):
 * ⚛️ Dan: "Hook 应该返回完整的状态信息"
 * ☕ Bloch: "提供清晰的数据状态反馈"
 * 🐧 Linus: "错误处理要优雅且不影响用户体验"
 * 🏛️ Fowler: "将数据获取与 UI 状态管理分离"
 */

import { useCallback, useEffect, useState } from "react"

import type { AccountContext, AuthStorage, PeerSpendingStorage } from "~/types"

import { usePeerSpendingStorage } from "~/hooks/infrastructure"
import { AccountManager } from "~/lib/account"
import { getStorageManager, StorageDomain } from "~/lib/storage"
import { fetchPeerSpendingToday } from "~/modules/peerSpending"

/**
 * Peer Spending 数据状态
 */
export interface PeerSpendingData {
  /** 同行消费数据 */
  data: null | PeerSpendingStorage
  /** 错误信息 */
  error: null | string
  /** 加载状态 */
  loading: boolean
  /** 手动刷新函数 */
  refresh: () => Promise<void>
}

/**
 * 获取同行消费数据 Hook
 * 自动订阅存储变化，提供手动刷新能力
 */
export function usePeerSpending(): PeerSpendingData {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)

  // 订阅存储中的数据
  const storageData = usePeerSpendingStorage()

  // 手动刷新函数
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 构建 AccountContext
      const storageManager = getStorageManager()
      const accountManager = new AccountManager(storageManager)
      const currentAccount = await accountManager.getCurrentAccount()

      if (!currentAccount) {
        throw new Error("No active account")
      }

      const authData = await storageManager.get<AuthStorage>(
        currentAccount.id,
        StorageDomain.AUTH
      )

      if (!authData) {
        throw new Error("No authentication data")
      }

      const context: AccountContext = {
        accountId: currentAccount.id,
        authData,
        site: currentAccount.site,
        timestamp: Date.now()
      }

      await fetchPeerSpendingToday(context)
      // 数据会通过存储订阅自动更新
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "获取同行消费数据失败"
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载
  useEffect(() => {
    // 如果没有数据，触发一次加载
    if (!storageData.data && !loading && !error) {
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 只在组件挂载时执行一次

  return {
    data: storageData.data,
    error,
    loading,
    refresh
  }
}
