import { api } from "~/lib/api/PackyCodeApiClient"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { type SystemPreferenceStorage, type UserInfo } from "~/types"
const logger = loggers.auth

export async function fetchUserInfo(): Promise<null | UserInfo> {
  try {
    // 使用统一的API客户端，自动处理URL适配、认证和错误处理
    const rawData = await api.getUserInfo()

    // 转换为新的存储格式
    const dailyLimit = Number(rawData.daily_budget_usd) || 0
    const dailySpent = Number(rawData.daily_spent_usd) || 0
    const monthlyLimit = Number(rawData.monthly_budget_usd) || 0
    const monthlySpent = Number(rawData.monthly_spent_usd) || 0

    const userInfoStorage: UserInfo = {
      budgets: {
        daily: {
          limit: dailyLimit,
          remaining: Math.max(0, dailyLimit - dailySpent),
          spent: dailySpent
        },
        monthly: {
          limit: monthlyLimit,
          remaining: Math.max(0, monthlyLimit - monthlySpent),
          spent: monthlySpent
        }
      },
      id: "current-user" // 暂时硬编码，后续可从token中解析
    }

    const storageManager = await getStorageManager()

    // 检查 opus_enabled 状态变化
    const systemPref = await storageManager.get<SystemPreferenceStorage>(
      StorageDomain.SYSTEM_PREFERENCE
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
    await storageManager.set(StorageDomain.SYSTEM_PREFERENCE, {
      opus_enabled: currentOpusState
    })

    // 存储用户信息
    await storageManager.set(StorageDomain.USER_INFO, userInfoStorage, true)

    return userInfoStorage
  } catch (error) {
    // 统一API客户端已经处理了认证错误和token清理
    // 这里只需要处理业务逻辑错误
    if (error instanceof Error && error.name === "AuthenticationError") {
      logger.debug("Authentication failed, returning null")
      return null
    }

    // 其他错误继续抛出
    const errorMessage =
      error instanceof Error ? error.message : "获取用户信息失败"
    logger.error("Failed to fetch user info:", errorMessage)
    throw new Error(errorMessage)
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
