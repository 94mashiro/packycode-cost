import { useCallback, useMemo } from "react"

import { useUserPreference } from "~/hooks/infrastructure/useStorageHooks"
import { loggers } from "~/lib/logger"
import {
  getActiveAccountData,
  setActiveAccountData
} from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"
import { getNotificationFieldName } from "~/services/notifications/fieldNames"
import { type NotificationKey, type UserPreferenceStorage } from "~/types"
import { PackySite } from "~/types/account"

const logger = loggers.ui

interface NotificationGroup {
  description: string
  settings: NotificationSetting[]
  title: string
}

interface NotificationSetting {
  description: string
  enabled: boolean
  icon: string
  id: NotificationKey
  label: string
}

export function useNotificationSettings() {
  const { data: userPreference } = useUserPreference()

  const notificationGroups: NotificationGroup[] = useMemo(
    () => [
      {
        description: "商品恢复购买时发送桌面通知",
        settings: [
          {
            description: "www.packycode.com",
            enabled:
              userPreference?.[
                getNotificationFieldName("purchase", PackySite.WWW)
              ] ?? true,
            icon: "🚌",
            id: getNotificationFieldName("purchase", PackySite.WWW),
            label: "主站"
          },
          {
            description: "share.packycode.com",
            enabled:
              userPreference?.[
                getNotificationFieldName("purchase", PackySite.SHARED)
              ] ?? true,
            icon: "🚗",
            id: getNotificationFieldName("purchase", PackySite.SHARED),
            label: "拼车站"
          },
          {
            description: "codex.packycode.com",
            enabled:
              userPreference?.[
                getNotificationFieldName("purchase", PackySite.CODEX)
              ] ?? true,
            icon: "💻",
            id: getNotificationFieldName("purchase", PackySite.CODEX),
            label: "Codex 站"
          }
        ],
        title: "购买开放提醒"
      },
      {
        description: "Opus 模型状态变更时发送桌面通知",
        settings: [
          {
            description: "www.packycode.com",
            enabled:
              userPreference?.[
                getNotificationFieldName("opus", PackySite.WWW)
              ] ?? true,
            icon: "🤖",
            id: getNotificationFieldName("opus", PackySite.WWW),
            label: "主站"
          }
        ],
        title: "Opus 模型可用性通知"
      }
    ],
    [userPreference]
  )

  const toggleSetting = useCallback(async (settingId: NotificationKey) => {
    try {
      const currentPreference =
        await getActiveAccountData<UserPreferenceStorage>(
          StorageDomain.USER_PREFERENCE
        )

      const currentValue = currentPreference?.[settingId]
      const newValue = currentValue === undefined ? false : !currentValue

      const updatedPreference: UserPreferenceStorage = {
        ...currentPreference,
        [settingId]: newValue
      }

      await setActiveAccountData(
        StorageDomain.USER_PREFERENCE,
        updatedPreference
      )
    } catch (error) {
      logger.error("Failed to toggle notification setting:", error)
    }
  }, [])

  return {
    notificationGroups,
    toggleSetting
  }
}
