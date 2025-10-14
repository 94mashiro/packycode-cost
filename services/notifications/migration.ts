import { loggers } from "~/lib/logger"
import {
  getActiveAccountData,
  setActiveAccountData
} from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"
import { getNotificationFieldName } from "~/services/notifications/fieldNames"
import { type UserPreferenceStorage } from "~/types"
import { PackySite } from "~/types/account"

const logger = loggers.migration

/**
 * 迁移通知偏好字段
 *
 * 从旧字段（短标识符）迁移到新字段（完整域名）
 * - 旧字段：opus_notification_www, purchase_notification_www, etc.
 * - 新字段：opus_notification_www.packycode.com, purchase_notification_www.packycode.com, etc.
 *
 * 设计原则：单一数据源，直接使用 site 枚举值
 */
export async function migrateNotificationPreferences(): Promise<boolean> {
  try {
    const userPreference = await getActiveAccountData<UserPreferenceStorage>(
      StorageDomain.USER_PREFERENCE
    )

    if (!userPreference) {
      logger.debug("No UserPreference found, skipping notification migration")
      return false
    }

    let needsMigration = false
    const migrated: UserPreferenceStorage = { ...userPreference }

    // 迁移 Opus 通知（仅主站）
    if (userPreference.opus_notification !== undefined) {
      const newKey = getNotificationFieldName("opus", PackySite.WWW)
      if (migrated[newKey] === undefined) {
        migrated[newKey] = userPreference.opus_notification
        needsMigration = true
        logger.info(`Migrating opus_notification → ${newKey}`)
      }
    }

    if (userPreference.opus_notification_www !== undefined) {
      const newKey = getNotificationFieldName("opus", PackySite.WWW)
      if (migrated[newKey] === undefined) {
        migrated[newKey] = userPreference.opus_notification_www
        needsMigration = true
        logger.info(`Migrating opus_notification_www → ${newKey}`)
      }
    }

    // 迁移购买通知
    if (userPreference.purchase_notification !== undefined) {
      // 旧的全局字段迁移到所有站点
      const sites = [PackySite.WWW, PackySite.SHARED, PackySite.CODEX]
      for (const site of sites) {
        const newKey = getNotificationFieldName("purchase", site)
        if (migrated[newKey] === undefined) {
          migrated[newKey] = userPreference.purchase_notification
          needsMigration = true
          logger.info(`Migrating purchase_notification → ${newKey}`)
        }
      }
    }

    if (userPreference.purchase_notification_www !== undefined) {
      const newKey = getNotificationFieldName("purchase", PackySite.WWW)
      if (migrated[newKey] === undefined) {
        migrated[newKey] = userPreference.purchase_notification_www
        needsMigration = true
        logger.info(`Migrating purchase_notification_www → ${newKey}`)
      }
    }

    if (userPreference.purchase_notification_shared !== undefined) {
      const newKey = getNotificationFieldName("purchase", PackySite.SHARED)
      if (migrated[newKey] === undefined) {
        migrated[newKey] = userPreference.purchase_notification_shared
        needsMigration = true
        logger.info(`Migrating purchase_notification_shared → ${newKey}`)
      }
    }

    if (userPreference.purchase_notification_codex !== undefined) {
      const newKey = getNotificationFieldName("purchase", PackySite.CODEX)
      if (migrated[newKey] === undefined) {
        migrated[newKey] = userPreference.purchase_notification_codex
        needsMigration = true
        logger.info(`Migrating purchase_notification_codex → ${newKey}`)
      }
    }

    if (needsMigration) {
      await setActiveAccountData(StorageDomain.USER_PREFERENCE, migrated)
      logger.info("✅ Notification preferences migrated successfully")
      return true
    }

    logger.debug("No notification migration needed")
    return false
  } catch (error) {
    logger.error("Failed to migrate notification preferences:", error)
    return false
  }
}
