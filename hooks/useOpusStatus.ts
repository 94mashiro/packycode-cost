import { Storage } from "@plasmohq/storage"
import { useEffect, useState } from "react"

import { type UserInfo } from "../utils/userInfo"

const storage = new Storage()

interface OpusStatusData {
  enabled: boolean | null
  error: null | string
  lastUpdated: null | number
  loading: boolean
}

export function useOpusStatus() {
  const [data, setData] = useState<OpusStatusData>({
    enabled: null,
    error: null,
    lastUpdated: null,
    loading: true
  })

  const fetchOpusStatus = async (isInitial = false) => {
    try {
      if (isInitial) {
        setData((prev) => ({ ...prev, error: null, loading: true }))
      }

      // 从缓存的用户信息中获取 opus_enabled 状态
      const cachedUserInfo = await storage.get<UserInfo>("cached_user_info")
      const cacheTimestamp = await storage.get<number>("cache_timestamp")

      if (cachedUserInfo && typeof cachedUserInfo.opus_enabled === "boolean") {
        setData((prev) => ({
          ...prev,
          enabled: cachedUserInfo.opus_enabled,
          error: null,
          lastUpdated: cacheTimestamp || null,
          loading: false
        }))
      } else {
        setData((prev) => ({
          ...prev,
          enabled: null,
          error: null,
          lastUpdated: null,
          loading: false
        }))
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "获取 Opus 状态失败"

      if (isInitial) {
        setData({
          enabled: null,
          error: errorMessage,
          lastUpdated: null,
          loading: false
        })
      } else {
        setData((prev) => ({
          ...prev,
          error: prev.enabled !== null ? prev.error : errorMessage
        }))
      }
    }
  }

  useEffect(() => {
    // 初始加载
    fetchOpusStatus(true)

    const handleStorageChange = (changes: any) => {
      if (changes.cached_user_info || changes.cache_timestamp) {
        fetchOpusStatus(false)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  return {
    enabled: data.enabled,
    error: data.error,
    lastUpdated: data.lastUpdated,
    loading: data.loading,
    refresh: () => fetchOpusStatus(false)
  }
}
