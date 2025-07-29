import { Storage } from "@plasmohq/storage"

import { clearPluginTokenOnly } from "./auth"

const storage = new Storage()

export interface UserInfo {
  daily_budget_usd: number
  daily_spent_usd: number
  monthly_budget_usd: number
  monthly_spent_usd: number
}

export async function fetchUserInfo(): Promise<null | UserInfo> {
  try {
    const token = await storage.get("packy_token")
    const tokenType = await storage.get("packy_token_type")
    const tokenTimestamp = await storage.get("packy_token_timestamp")

    // API Key不需要检查timestamp
    if (!token || (tokenType !== "api_key" && !tokenTimestamp)) {
      return null
    }

    const response = await fetch(
      "https://www.packycode.com/api/backend/users/info",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        method: "GET"
      }
    )

    if (!response.ok) {
      // API Key 的 400/401 错误也需要清除token
      if (
        response.status === 400 ||
        response.status === 401 ||
        response.status === 403
      ) {
        await clearPluginTokenOnly()
        return null
      }
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const rawData = await response.json()

    const userInfo: UserInfo = {
      daily_budget_usd: Number(rawData.daily_budget_usd) || 0,
      daily_spent_usd: Number(rawData.daily_spent_usd) || 0,
      monthly_budget_usd: Number(rawData.monthly_budget_usd) || 0,
      monthly_spent_usd: Number(rawData.monthly_spent_usd) || 0
    }

    await storage.set("cached_user_info", userInfo)
    await storage.set("cache_timestamp", Date.now())

    return userInfo
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "获取用户信息失败")
  }
}
