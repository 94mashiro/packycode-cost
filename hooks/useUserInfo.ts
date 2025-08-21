import { Storage } from "@plasmohq/storage"
import { useCallback, useEffect, useState } from "react"

import { type UserInfoData } from "../types"
import { fetchUserInfo, type UserInfo } from "../utils/userInfo"

const storage = new Storage()

export function useUserInfo(token: null | string): UserInfoData {
  const [data, setData] = useState<{
    error: null | string
    loading: boolean
    userInfo: null | UserInfo
  }>({
    error: null,
    loading: false,
    userInfo: null
  })

  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const cachedUserInfo = await storage.get<UserInfo>("user_info")

        // Just load whatever we have cached, period.
        // The alarm keeps it fresh every 30 seconds.
        if (cachedUserInfo) {
          setData((prev) => ({
            ...prev,
            userInfo: cachedUserInfo
          }))
        }
      } catch {}
    }

    loadCachedData()
  }, [])

  const fetchUserInfoData = useCallback(async () => {
    if (!token) {
      setData({ error: null, loading: false, userInfo: null })
      return
    }

    setData((prev) => ({ ...prev, error: null, loading: true }))

    try {
      const userInfo = await fetchUserInfo()

      if (userInfo) {
        setData({ error: null, loading: false, userInfo })
      } else {
        // If fetchUserInfo returns null, token might be invalid
        // Let the user see the error state instead of force reloading
        setData({
          error: "无法获取用户信息",
          loading: false,
          userInfo: null
        })
      }
    } catch (error) {
      setData({
        error: error instanceof Error ? error.message : "获取用户信息失败",
        loading: false,
        userInfo: null
      })
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchUserInfoData()
    }
  }, [fetchUserInfoData, token])

  return {
    ...data,
    refresh: fetchUserInfoData
  }
}
