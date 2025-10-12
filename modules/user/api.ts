import browser from "webextension-polyfill"

import { AccountManager } from "~/lib/account"
import { api } from "~/lib/api/PackyCodeApiClient"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import {
  type AuthStorage,
  type SystemPreferenceStorage,
  type UserInfo
} from "~/types"
import { PackySite } from "~/types/account"
import { checkOpusNotificationPermission } from "~/utils/notificationPermissions"

const logger = loggers.auth

export async function fetchUserInfo(
  context: import("~/types").AccountContext
): Promise<null | UserInfo> {
  try {
    // 直接从 context 解构所需信息，无需查询
    const { accountId, site } = context
    const storageManager = getStorageManager()

    // 使用统一的API客户端，传递完整上下文
    const rawData = await api.getUserInfo(context)

    // 转换为新的存储格式
    const dailyLimit = Number(rawData.daily_budget_usd) || 0
    const dailySpent = Number(rawData.daily_spent_usd) || 0
    const monthlyLimit = Number(rawData.monthly_budget_usd) || 0
    const monthlySpent = Number(rawData.monthly_spent_usd) || 0

    const userInfoStorage: UserInfo = {
      balance_usd: rawData.balance_usd, // Shared 公交车模式下的账户余额
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
      }
      // 删除无用的 id 硬编码 - 该字段无实际用途
    }

    // 只在公交车模式下处理 opus_enabled 状态变化（排除 CODEX，因为没有 Opus 模型）
    if (site === PackySite.WWW) {
      // 检查 opus_enabled 状态变化
      const systemPref = await storageManager.getForAccount<SystemPreferenceStorage>(
        accountId,
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
        // 检查用户是否开启了 Opus 通知
        const notificationEnabled = await checkOpusNotificationPermission()

        if (notificationEnabled) {
          logger.info(
            `Opus status changed (公交车模式): ${previousOpusState} → ${currentOpusState}`
          )
          await triggerOpusStatusNotification(currentOpusState)
        } else {
          logger.debug("Opus notification disabled by user settings, skipping")
        }
      }

      // 更新系统偏好
      await storageManager.setForAccount(
        accountId,
        StorageDomain.SYSTEM_PREFERENCE,
        {
          opus_enabled: currentOpusState
        }
      )
    } else {
      // 站点名称映射
      const siteNames: Record<PackySite, string> = {
        [PackySite.CODEX]: "Codex",
        [PackySite.SHARED]: "滴滴车",
        [PackySite.WWW]: "公交车"
      }

      const siteName = siteNames[site]
      const siteNote =
        site === PackySite.SHARED
          ? "，由 SharedSpace API 负责管理"
          : site === PackySite.CODEX
            ? "，没有 Opus 模型"
            : ""

      logger.debug(`⏭️ 跳过 Opus 状态更新：当前为${siteName}模式${siteNote}`)
    }

    // 存储用户信息
    await storageManager.setForAccount(
      accountId,
      StorageDomain.USER_INFO,
      userInfoStorage
    )

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
    await browser.notifications.create(notificationId, {
      iconUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
      message: enabled ? "Claude Opus 模型已开启！" : "Claude Opus 模型已关闭",
      title: "PackyCode Opus 状态",
      type: "basic"
    })
    logger.debug(
      "Opus status notification created successfully:",
      notificationId
    )
  } catch (error) {
    logger.error("Error creating opus status notification:", error)
  }
}
