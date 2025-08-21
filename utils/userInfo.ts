import { Storage } from "@plasmohq/storage"

import { userApi } from "../api"
import { TokenType, type UserInfo } from "../types"
import { clearPluginTokenOnly } from "./auth"
import {
  checkOpusNotification,
  getOpusState,
  setOpusState
} from "./notificationStates"

const storage = new Storage()

export { type UserInfo }

export async function fetchUserInfo(): Promise<null | UserInfo> {
  try {
    const token = await storage.get<string>("token")
    const tokenType = await storage.get<string>("token_type")
    const tokenExpiry = await storage.get<number>("token_expiry")

    // API Key不需要检查过期时间
    if (!token) {
      return null
    }

    // JWT需要检查过期时间（如果有expiry的话）
    if (
      tokenType === TokenType.JWT &&
      tokenExpiry &&
      tokenExpiry < Date.now()
    ) {
      await clearPluginTokenOnly()
      return null
    }

    const result = await userApi.getUserInfo(token, tokenType as TokenType)

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
    // 职责分离：先获取，再判断，最后更新
    const previousOpusState = await getOpusState()
    const shouldNotify = checkOpusNotification(
      previousOpusState,
      userInfo.opus_enabled
    )

    if (shouldNotify) {
      console.log(
        `[OPUS STATUS] Changed: ${previousOpusState} → ${userInfo.opus_enabled}`
      )
      await triggerOpusStatusNotification(userInfo.opus_enabled)
    }

    // 更新状态 - 单一职责
    await setOpusState(userInfo.opus_enabled)
    await storage.set("user_info", userInfo)

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
