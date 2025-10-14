import { loggers } from "~/lib/logger"
import { getActiveAccountData } from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"
import { type UserPreferenceStorage } from "~/types"
import { PackySite } from "~/types/account"

import { getNotificationFieldName } from "./fieldNames"

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

    // ✅ 使用统一的字段名生成器，直接消费 site 枚举值
    const fieldName = getNotificationFieldName("opus", site)
    const fieldValue = userPreference?.[fieldName]

    const enabled = fieldValue ?? true

    logger.debug(
      `Opus notification permission (${site}): ${enabled} (field: ${fieldName}, value: ${fieldValue})`
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

    // ✅ 使用统一的字段名生成器，直接消费 site 枚举值
    const fieldName = getNotificationFieldName("purchase", site)
    const fieldValue = userPreference?.[fieldName]

    const enabled = fieldValue ?? true

    logger.debug(
      `Purchase notification permission (${site}): ${enabled} (field: ${fieldName}, value: ${fieldValue})`
    )
    return enabled
  } catch (error) {
    logger.error("Failed to check purchase notification permission:", error)
    return true
  }
}
