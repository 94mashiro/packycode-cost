/**
 * SharedSpace API 模块
 *
 * 负责从 my-assignments 接口获取滴滴车模式下的 opus 状态
 * Linus: "代码应该准确反映其真实用途"
 * Dan: "避免过度抽象，保持简单直接"
 */

import { api } from "~/lib/api/PackyCodeApiClient"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import {
  AccountVersion,
  ApiEndpointType,
  type SharedSpaceApiResponse,
  type SystemPreferenceStorage,
  type UserPreferenceStorage
} from "~/types"

const logger = loggers.auth

/**
 * 获取滴滴车模式下的 Opus 状态
 *
 * 设计决策：
 * 1. 仅在滴滴车模式（PRIVATE）下执行
 * 2. 从 my-assignments 接口获取第一个账号的 opus_enabled 状态
 * 3. 将状态存储到 SystemPreference，与现有机制保持一致
 * 4. 不创建独立的存储域，避免数据冗余
 */
export async function fetchPrivateOpusStatus(): Promise<void> {
  try {
    // 获取当前账号版本
    const storageManager = await getStorageManager()
    const userPreference = await storageManager.get<UserPreferenceStorage>(
      StorageDomain.USER_PREFERENCE
    )
    const currentVersion =
      userPreference?.account_version ?? AccountVersion.SHARED

    // 只在滴滴车模式下执行
    if (currentVersion !== AccountVersion.PRIVATE) {
      logger.debug(
        `⏭️ 跳过私有 Opus 状态获取：当前为${currentVersion === AccountVersion.SHARED ? "公交车" : "未知"}模式`
      )
      return
    }

    logger.info("🔍 获取滴滴车模式 Opus 状态...")

    // 使用统一的API客户端获取数据
    const rawData = await api.get<SharedSpaceApiResponse>(
      ApiEndpointType.SHARED_SPACE
    )

    // 提取第一个账号的 opus_enabled 状态
    const opusEnabled = rawData.assignments?.[0]?.opus_enabled ?? false

    // 获取当前存储的状态
    const systemPref = await storageManager.get<SystemPreferenceStorage>(
      StorageDomain.SYSTEM_PREFERENCE
    )
    const previousOpusState = systemPref?.opus_enabled

    // 只在状态变化时更新
    if (previousOpusState !== opusEnabled) {
      logger.info(
        `📝 Opus 状态变化 (滴滴车模式): ${previousOpusState} → ${opusEnabled}`
      )

      // 更新系统偏好，与 fetchUserInfo 的处理保持一致
      await storageManager.set(StorageDomain.SYSTEM_PREFERENCE, {
        opus_enabled: opusEnabled
      })

      // 触发通知（如果从 false 变为 true）
      if (!previousOpusState && opusEnabled) {
        await triggerOpusStatusNotification(opusEnabled)
      }
    } else {
      logger.debug(`✅ Opus 状态未变化: ${opusEnabled}`)
    }
  } catch (error) {
    // 静默处理错误，不影响其他功能
    if (error instanceof Error && error.name === "AuthenticationError") {
      logger.debug("Authentication failed for private opus status")
      return
    }

    // 记录错误但不抛出，避免影响其他任务
    const errorMessage =
      error instanceof Error ? error.message : "获取私有 Opus 状态失败"
    logger.debug("Failed to fetch private opus status:", errorMessage)
  }
}

/**
 * 触发 Opus 模型状态变化通知
 * 复用 user/api.ts 中的逻辑
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
            "Opus status notification created:",
            createdNotificationId
          )
        }
      }
    )
  } catch (error) {
    logger.error("Error creating opus status notification:", error)
  }
}
