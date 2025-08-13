import { Storage } from "@plasmohq/storage"
import { useEffect, useState } from "react"

import type { PackyConfig } from "../utils/purchaseStatus"

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

  const fetchPurchaseStatus = async () => {
    try {
      setData((prev) => ({ ...prev, error: null, loading: true }))

      const config = await storage.get<PackyConfig>("packy_config")
      const timestamp = await storage.get<number>("packy_config_timestamp")

      if (config) {
        setData({
          config,
          error: null,
          lastUpdated: timestamp || null,
          loading: false
        })
      } else {
        // 等待后台轮询提供数据
        setData({
          config: null,
          error: null,
          lastUpdated: null,
          loading: false
        })
      }
    } catch (error) {
      setData({
        config: null,
        error: error instanceof Error ? error.message : "获取购买状态失败",
        lastUpdated: null,
        loading: false
      })
    }
  }

  useEffect(() => {
    fetchPurchaseStatus()

    // 监听storage变化
    const handleStorageChange = (changes: any) => {
      if (changes.packy_config || changes.packy_config_timestamp) {
        fetchPurchaseStatus()
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  return {
    ...data,
    refresh: fetchPurchaseStatus
  }
}
