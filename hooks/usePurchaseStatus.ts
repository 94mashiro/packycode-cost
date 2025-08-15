import { Storage } from "@plasmohq/storage"
import { useEffect, useState } from "react"

import {
  getCurrentPurchaseConfig,
  type PackyConfig
} from "../utils/purchaseStatus"

const storage = new Storage()

interface PurchaseStatusData {
  config: null | PackyConfig
  error: null | string
  lastUpdated: null | number
  loading: boolean
}

export function usePurchaseStatus() {
  const [data, setData] = useState<PurchaseStatusData>({
    config: null,
    error: null,
    lastUpdated: null,
    loading: true
  })

  const fetchPurchaseStatus = async (isInitial = false) => {
    try {
      if (isInitial) {
        setData((prev) => ({ ...prev, error: null, loading: true }))
      }

      const config = await getCurrentPurchaseConfig()
      const timestamp = await storage.get<number>("packy_config_timestamp")

      setData((prev) => ({
        ...prev,
        config,
        error: null,
        lastUpdated: timestamp || null,
        loading: false
      }))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "获取购买状态失败"

      if (isInitial) {
        setData({
          config: null,
          error: errorMessage,
          lastUpdated: null,
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

    const handleStorageChange = (changes: any) => {
      if (changes.packy_config || changes.packy_config_timestamp) {
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
    lastUpdated: data.lastUpdated,
    loading: data.loading,
    refresh: () => fetchPurchaseStatus(false)
  }
}
