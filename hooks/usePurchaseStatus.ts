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
  loading: boolean
}

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

    const handleStorageChange = (changes: any) => {
      if (changes.packy_config) {
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
