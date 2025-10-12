import { loggers } from "~/lib/logger"
import { getActiveAccountData } from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"
import { type UserPreferenceStorage } from "~/types"
import { PackySite } from "~/types/account"

const logger = loggers.ui

/**
 * 通知设置检查工具
 *
 * 提供站点级的通知权限检查机制，支持细粒度控制
 * 使用三级回退逻辑确保向后兼容：新字段 → 旧字段 → 默认值
 */

/**
 * 获取站点对应的通知字段名
 * @param type 通知类型（purchase 或 opus）
 * @param site 站点枚举
 * @returns UserPreferenceStorage 中的字段名
 *
 * 注意：Opus 通知仅支持 WWW 站点
 */
function getSiteNotificationField(
  type: "purchase" | "opus",
  site: PackySite
): keyof UserPreferenceStorage {
  if (type === "purchase") {
    return `purchase_notification_${site}` as keyof UserPreferenceStorage
  } else {
    // Opus 仅支持 WWW
    if (site !== PackySite.WWW) {
      throw new Error(
        `Opus notifications only supported for WWW site, got: ${site}`
      )
    }
    return "opus_notification_www" as keyof UserPreferenceStorage
  }
}

/**
 * 检查是否允许发送 Opus 模型状态通知
 * @param site 站点枚举，用于确定检查哪个站点的通知设置
 * @returns 是否允许发送 Opus 通知
 *
 * 注意：Opus 通知仅支持公交车模式 (WWW)
 */
export async function checkOpusNotificationPermission(
  site: PackySite
): Promise<boolean> {
  try {
    // Opus 通知仅支持公交车模式
    if (site !== PackySite.WWW) {
      logger.debug(
        `Opus notification not supported for ${site} site (only WWW supported)`
      )
      return false
    }

    const userPreference = await getActiveAccountData<UserPreferenceStorage>(
      StorageDomain.USER_PREFERENCE
    )

    const fieldName = getSiteNotificationField("opus", site)
    const newFieldValue = userPreference?.[fieldName] as boolean | undefined

    // 三级回退逻辑：新字段 → 旧字段 → 默认值
    const enabled = newFieldValue ?? userPreference?.opus_notification ?? true

    logger.debug(
      `Opus notification permission (${site}): ${enabled} (field: ${String(fieldName)}, new: ${newFieldValue}, old: ${userPreference?.opus_notification})`
    )
    return enabled
  } catch (error) {
    logger.error("Failed to check opus notification permission:", error)
    // 发生错误时默认不发送通知（更保守的策略）
    return false
  }
}

/**
 * 检查是否允许发送购买开放通知
 * @param site 站点枚举，用于确定检查哪个站点的通知设置
 * @returns 是否允许发送购买通知
 */
export async function checkPurchaseNotificationPermission(
  site: PackySite
): Promise<boolean> {
  try {
    const userPreference = await getActiveAccountData<UserPreferenceStorage>(
      StorageDomain.USER_PREFERENCE
    )

    const fieldName = getSiteNotificationField("purchase", site)
    const newFieldValue = userPreference?.[fieldName] as boolean | undefined

    // 三级回退逻辑：新字段 → 旧字段 → 默认值
    const enabled =
      newFieldValue ?? userPreference?.purchase_notification ?? true

    logger.debug(
      `Purchase notification permission (${site}): ${enabled} (field: ${String(fieldName)}, new: ${newFieldValue}, old: ${userPreference?.purchase_notification})`
    )
    return enabled
  } catch (error) {
    logger.error("Failed to check purchase notification permission:", error)
    // 发生错误时默认允许通知（向下兼容）
    return true
  }
}
