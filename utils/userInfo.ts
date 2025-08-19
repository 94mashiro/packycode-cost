import { Storage } from "@plasmohq/storage"

import { clearPluginTokenOnly } from "./auth"
import { get } from "./request"

const storage = new Storage()

export interface UserInfo {
  daily_budget_usd: number
  daily_spent_usd: number
  monthly_budget_usd: number
  monthly_spent_usd: number
  opus_enabled: boolean
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
      monthly_spent_usd: Number(rawData.monthly_spent_usd) || 0,
      opus_enabled: Boolean(rawData.opus_enabled)
    }

    // 检查 opus_enabled 状态变化
    const lastOpusEnabled = await storage.get<boolean>("last_opus_enabled")
    const currentOpusEnabled = userInfo.opus_enabled

    if (
      lastOpusEnabled !== undefined &&
      lastOpusEnabled !== currentOpusEnabled
    ) {
      console.log(
        `[OPUS STATUS] Changed: ${lastOpusEnabled} → ${currentOpusEnabled}`
      )
      await triggerOpusStatusNotification(currentOpusEnabled)
    }

    // 更新存储状态
    await storage.set("last_opus_enabled", currentOpusEnabled)
    await storage.set("cached_user_info", userInfo)
    await storage.set("cache_timestamp", Date.now())

    return userInfo
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "获取用户信息失败")
  }
}

/**
 * 触发 Opus 模型状态变化通知
 */
async function triggerOpusStatusNotification(enabled: boolean): Promise<void> {
  const notificationId = `opus-status-${Date.now()}`

  try {
    chrome.notifications.create(
      notificationId,
      {
        iconUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
        message: enabled
          ? "Claude Opus 模型已开启！"
          : "Claude Opus 模型已关闭",
        title: "PackyCode Opus 状态",
        type: "basic"
      },
      (createdNotificationId) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[NOTIFICATION] Opus status creation failed:",
            chrome.runtime.lastError
          )
        } else {
          console.log(
            "[NOTIFICATION] Opus status created successfully:",
            createdNotificationId
          )
        }
      }
    )
  } catch (error) {
    console.error(
      "[NOTIFICATION] Error creating opus status notification:",
      error
    )
  }
}
