import { Storage } from "@plasmohq/storage"

import { clearPluginTokenOnly } from "./auth"
import { get } from "./request"

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

    const result = await get<any>(
      "https://www.packycode.com/api/backend/users/info",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    )

    if (!result.success) {
      // 检查是否是认证错误
      if (
        result.error?.includes("400") ||
        result.error?.includes("401") ||
        result.error?.includes("403")
      ) {
        await clearPluginTokenOnly()
        return null
      }
      throw new Error(result.error || "获取用户信息失败")
    }

    const rawData = result.data
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
