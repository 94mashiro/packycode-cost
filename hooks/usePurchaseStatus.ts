import { useEffect, useState } from "react"

import { StorageDomain } from "~/lib/storage/domains"
import { getCurrentPurchaseConfig } from "~/modules/purchase"

import { type PurchaseStatusData } from "../types"

export function usePurchaseStatus() {
  const [data, setData] = useState<PurchaseStatusData>({
    config: null,
    error: null,
    loading: true
  })

  const fetchPurchaseStatus = async (isInitial = false) => {
    try {
      if (isInitial) {
        setData((prev) => ({ ...prev, error: null, loading: true }))
      }

      const config = await getCurrentPurchaseConfig()

      setData((prev) => ({
        ...prev,
        config,
        error: null,
        loading: false
      }))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "获取购买状态失败"

      if (isInitial) {
        setData({
          config: null,
          error: errorMessage,
          loading: false
        })
      } else {
        setData((prev) => ({
          ...prev,
          error: prev.config ? prev.error : errorMessage
        }))
      }
    }
  }

  useEffect(() => {
    // 初始加载
    fetchPurchaseStatus(true)

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (
        changes[`shared.${StorageDomain.PURCHASE_CONFIG}`] ||
        changes[`private.${StorageDomain.PURCHASE_CONFIG}`]
      ) {
        fetchPurchaseStatus(false)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  return {
    config: data.config,
    error: data.error,
    loading: data.loading,
    refresh: () => fetchPurchaseStatus(false)
  }
}
