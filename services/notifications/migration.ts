import { loggers } from "~/lib/logger"
import {
  getActiveAccountData,
  setActiveAccountData
} from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"
import { type UserPreferenceStorage } from "~/types"

const logger = loggers.migration

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

    if (userPreference.opus_notification !== undefined) {
      if (migrated.opus_notification_www === undefined) {
        migrated.opus_notification_www = userPreference.opus_notification
        needsMigration = true
        logger.info(
          `Migrating opus_notification: ${userPreference.opus_notification} → opus_notification_www`
        )
      }
    }

    if (userPreference.purchase_notification !== undefined) {
      if (migrated.purchase_notification_www === undefined) {
        migrated.purchase_notification_www = userPreference.purchase_notification
        needsMigration = true
        logger.info(
          `Migrating purchase_notification → purchase_notification_www: ${userPreference.purchase_notification}`
        )
      }
      if (migrated.purchase_notification_shared === undefined) {
        migrated.purchase_notification_shared =
          userPreference.purchase_notification
        needsMigration = true
        logger.info(
          `Migrating purchase_notification → purchase_notification_shared: ${userPreference.purchase_notification}`
        )
      }
      if (migrated.purchase_notification_codex === undefined) {
        migrated.purchase_notification_codex =
          userPreference.purchase_notification
        needsMigration = true
        logger.info(
          `Migrating purchase_notification → purchase_notification_codex: ${userPreference.purchase_notification}`
        )
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
