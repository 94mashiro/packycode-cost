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
        `⏭️ 跳过私有 Opus 状态获取：当前为${
          currentVersion === AccountVersion.SHARED
            ? "公交车"
            : currentVersion === AccountVersion.CODEX_SHARED
              ? "Codex公交车"
              : "未知"
        }模式${currentVersion === AccountVersion.CODEX_SHARED ? "，没有 Opus 模型" : ""}`
      )
      return
    }

    logger.info("🔍 获取滴滴车模式 Opus 状态...")

    // 使用统一的API客户端获取数据
    const rawData = await api.get<SharedSpaceApiResponse>(
      ApiEndpointType.SHARED_SPACE
    )

    // 检查是否有有效的数据返回
    if (!rawData.assignments || rawData.assignments.length === 0) {
      logger.warn(
        "⚠️ SharedSpace API 返回了空的 assignments 数据，跳过 Opus 状态更新"
      )
      // 不写入存储，保持现有状态
      return
    }

    // 提取第一个账号的 opus_enabled 状态
    // 注意：只有在确实有数据时才读取，不使用默认值
    const [firstAssignment] = rawData.assignments
    if (typeof firstAssignment.opus_enabled !== "boolean") {
      logger.warn("⚠️ SharedSpace API 返回的 opus_enabled 不是布尔值，跳过更新")
      return
    }

    const opusEnabled = firstAssignment.opus_enabled
    const rateLimitResetAt = firstAssignment.rate_limit_reset_at

    // 获取当前存储的状态
    const systemPref = await storageManager.get<SystemPreferenceStorage>(
      StorageDomain.SYSTEM_PREFERENCE
    )
    const previousOpusState = systemPref?.opus_enabled
    const previousRateLimitResetAt = systemPref?.rate_limit_reset_at

    // 检查是否有任何变化
    const hasOpusChange = previousOpusState !== opusEnabled
    const hasRateLimitChange = previousRateLimitResetAt !== rateLimitResetAt

    // 只在状态变化时更新存储
    if (hasOpusChange || hasRateLimitChange) {
      if (hasOpusChange) {
        logger.info(
          `📝 Opus 状态变化 (滴滴车模式): ${previousOpusState} → ${opusEnabled}`
        )
      }

      if (hasRateLimitChange) {
        logger.info(
          `⏰ Rate limit reset 时间变化: ${previousRateLimitResetAt} → ${rateLimitResetAt}`
        )
      }

      // 更新系统偏好，包含 opus_enabled 和 rate_limit_reset_at
      await storageManager.set(StorageDomain.SYSTEM_PREFERENCE, {
        opus_enabled: opusEnabled,
        rate_limit_reset_at: rateLimitResetAt
      })

      // 滴滴车模式下不触发通知 - Opus 状态相对固定，无需动态通知
      logger.debug(
        `⏭️ 滴滴车模式下跳过 Opus 开启通知 - 状态相对固定，无需动态提醒`
      )
    } else {
      logger.debug(`✅ Opus 状态和 Rate limit 时间均未变化`)
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

// 删除 triggerOpusStatusNotification 函数
// 滴滴车模式下不需要 Opus 状态通知 - 状态相对固定，无需动态提醒
