import { useEffect, useState } from "react"

import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"

import { type OpusStatusData, type SystemPreferenceStorage } from "../types"

export function useOpusStatus() {
  const [data, setData] = useState<OpusStatusData>({
    enabled: null,
    error: null,
    loading: true
  })

  const fetchOpusStatus = async (isInitial = false) => {
    try {
      if (isInitial) {
        setData((prev) => ({ ...prev, error: null, loading: true }))
      }

      // 从系统偏好中获取 opus_enabled 状态
      const storageManager = await getStorageManager()
      const systemPref = await storageManager.get<SystemPreferenceStorage>(
        StorageDomain.SYSTEM_PREFERENCE
      )

      if (systemPref && typeof systemPref.opus_enabled === "boolean") {
        setData((prev) => ({
          ...prev,
          enabled: systemPref.opus_enabled,
          error: null,
          loading: false
        }))
      } else {
        setData((prev) => ({
          ...prev,
          enabled: null,
          error: null,
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

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>
    ) => {
      if (
        changes[`shared.${StorageDomain.SYSTEM_PREFERENCE}`] ||
        changes[`private.${StorageDomain.SYSTEM_PREFERENCE}`]
      ) {
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
    loading: data.loading,
    refresh: () => fetchOpusStatus(false)
  }
}
