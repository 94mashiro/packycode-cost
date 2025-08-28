import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { type UserPreferenceStorage } from "~/types"

const logger = loggers.ui

/**
 * 通知设置检查工具
 *
 * 提供统一的通知权限检查机制，在触发通知前验证用户设置
 */

/**
 * 通用通知权限检查
 * @param notificationType 通知类型
 * @returns 是否允许发送该类型通知
 */
export async function checkNotificationPermission(
  notificationType: "opus_notification" | "purchase_notification"
): Promise<boolean> {
  switch (notificationType) {
    case "opus_notification":
      return checkOpusNotificationPermission()
    case "purchase_notification":
      return checkPurchaseNotificationPermission()
    default:
      logger.warn(`Unknown notification type: ${notificationType}`)
      return false
  }
}

/**
 * 检查是否允许发送 Opus 模型状态通知
 * @returns 是否允许发送 Opus 通知
 */
export async function checkOpusNotificationPermission(): Promise<boolean> {
  try {
    const storageManager = await getStorageManager()
    const userPreference = await storageManager.get<UserPreferenceStorage>(
      StorageDomain.USER_PREFERENCE
    )

    // 默认关闭 Opus 通知
    const enabled = userPreference?.opus_notification ?? true

    logger.debug(`Opus notification permission check: ${enabled}`)
    return enabled
  } catch (error) {
    logger.error("Failed to check opus notification permission:", error)
    // 发生错误时默认不发送通知（更保守的策略）
    return false
  }
}

/**
 * 检查是否允许发送购买开放通知
 * @returns 是否允许发送购买通知
 */
export async function checkPurchaseNotificationPermission(): Promise<boolean> {
  try {
    const storageManager = await getStorageManager()
    const userPreference = await storageManager.get<UserPreferenceStorage>(
      StorageDomain.USER_PREFERENCE
    )

    // 默认开启购买通知
    const enabled = userPreference?.purchase_notification ?? true

    logger.debug(`Purchase notification permission check: ${enabled}`)
    return enabled
  } catch (error) {
    logger.error("Failed to check purchase notification permission:", error)
    // 发生错误时默认允许通知（向下兼容）
    return true
  }
}
