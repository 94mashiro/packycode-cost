import { Storage } from "@plasmohq/storage"

import { userApi } from "../api"
import {
  type AuthStorage,
  type SystemPreferenceStorage,
  TokenType,
  type UserInfoStorage
} from "../types"
import { clearPluginTokenOnly } from "./auth"
import { loggers } from "./logger"
import { STORAGE_KEYS } from "./storage-keys"

const storage = new Storage()
const logger = loggers.auth

export async function fetchUserInfo(): Promise<null | UserInfoStorage> {
  try {
    const authData = await storage.get<AuthStorage>(STORAGE_KEYS.AUTH)
    logger.debug("Auth data:", authData)

    // API Key不需要检查过期时间
    if (!authData?.token) {
      logger.debug("No token found")
      return null
    }

    // JWT需要检查过期时间（如果有expiry的话）
    if (
      authData.type === TokenType.JWT &&
      authData.expiry &&
      authData.expiry < Date.now()
    ) {
      await clearPluginTokenOnly()
      return null
    }

    const result = await userApi.getUserInfo(authData.token, authData.type)

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

    // 转换为新的存储格式
    const userInfoStorage: UserInfoStorage = {
      budgets: {
        daily: {
          limit: Number(rawData.daily_budget_usd) || 0,
          spent: Number(rawData.daily_spent_usd) || 0
        },
        monthly: {
          limit: Number(rawData.monthly_budget_usd) || 0,
          spent: Number(rawData.monthly_spent_usd) || 0
        }
      }
    }

    // 检查 opus_enabled 状态变化
    const systemPref = await storage.get<SystemPreferenceStorage>(
      STORAGE_KEYS.SYSTEM_PREFERENCE
    )
    const previousOpusState = systemPref?.opus_enabled
    const currentOpusState = Boolean(rawData.opus_enabled)

    // 判断是否需要通知
    const shouldNotify = checkOpusNotification(
      previousOpusState,
      currentOpusState
    )

    if (shouldNotify) {
      logger.info(
        `Opus status changed: ${previousOpusState} → ${currentOpusState}`
      )
      await triggerOpusStatusNotification(currentOpusState)
    }

    // 更新系统偏好
    await storage.set(STORAGE_KEYS.SYSTEM_PREFERENCE, {
      ...systemPref,
      opus_enabled: currentOpusState
    })

    // 存储用户信息
    await storage.set(STORAGE_KEYS.USER_INFO, userInfoStorage)

    return userInfoStorage
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "获取用户信息失败")
  }
}

/**
 * 检查是否需要Opus状态通知
 */
function checkOpusNotification(
  previousState: boolean | undefined,
  currentState: boolean
): boolean {
  // 仅在状态从其他值变为 true 时通知
  return previousState !== true && currentState === true
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
          logger.error(
            "Opus status notification creation failed:",
            chrome.runtime.lastError
          )
        } else {
          logger.debug(
            "Opus status notification created successfully:",
            createdNotificationId
          )
        }
      }
    )
  } catch (error) {
    logger.error("Error creating opus status notification:", error)
  }
}
