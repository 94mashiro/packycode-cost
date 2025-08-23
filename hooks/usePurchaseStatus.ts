import { usePurchaseConfig } from "~/hooks/useStorageHooks"

import { type PurchaseStatusData } from "../types"

/**
 * 购买状态 Hook
 *
 * 重构说明：
 * - 移除直接使用 chrome.storage.onChanged 的监听
 * - 使用统一的 usePurchaseConfig Hook（基于 Plasmo Storage）
 * - 保持相同的 API 接口
 */
export function usePurchaseStatus(): PurchaseStatusData & {
  refresh: () => Promise<void>
} {
  const { data: config, error, loading, refresh } = usePurchaseConfig()

  return {
    config,
    error,
    loading,
    refresh
  }
}
