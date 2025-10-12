import { loggers } from "~/lib/logger"
import { getActiveAccountData } from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"
import { type UserPreferenceStorage } from "~/types"
import { PackySite } from "~/types/account"

const logger = loggers.ui

export async function checkOpusNotificationPermission(
  site: PackySite
): Promise<boolean> {
  try {
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

    const enabled = newFieldValue ?? true

    logger.debug(
      `Opus notification permission (${site}): ${enabled} (field: ${String(fieldName)}, value: ${newFieldValue})`
    )
    return enabled
  } catch (error) {
    logger.error("Failed to check opus notification permission:", error)
    return false
  }
}

export async function checkPurchaseNotificationPermission(
  site: PackySite
): Promise<boolean> {
  try {
    const userPreference = await getActiveAccountData<UserPreferenceStorage>(
      StorageDomain.USER_PREFERENCE
    )

    const fieldName = getSiteNotificationField("purchase", site)
    const newFieldValue = userPreference?.[fieldName] as boolean | undefined

    const enabled = newFieldValue ?? true

    logger.debug(
      `Purchase notification permission (${site}): ${enabled} (field: ${String(fieldName)}, value: ${newFieldValue})`
    )
    return enabled
  } catch (error) {
    logger.error("Failed to check purchase notification permission:", error)
    return true
  }
}

function getSiteNotificationField(
  type: "opus" | "purchase",
  site: PackySite
): keyof UserPreferenceStorage {
  if (type === "purchase") {
    return `purchase_notification_${site}` as keyof UserPreferenceStorage
  } else {
    if (site !== PackySite.WWW) {
      throw new Error(
        `Opus notifications only supported for WWW site, got: ${site}`
      )
    }
    return "opus_notification_www" as keyof UserPreferenceStorage
  }
}
