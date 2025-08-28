import { useUserPreference } from "~/hooks/infrastructure/useStorageHooks"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { AccountVersion, type UserPreferenceStorage } from "~/types"

type NotificationKey = "opus_notification" | "purchase_notification"

interface NotificationSettingsProps {
  className?: string
}

export function NotificationSettings({
  className = ""
}: NotificationSettingsProps) {
  const { data: userPreference } = useUserPreference()

  // 推送设置配置 - 与存储中的字段对应
  const notificationSettings = [
    {
      description: "当购买功能恢复可用时推送提醒",
      enabled: userPreference?.purchase_notification ?? true, // 默认开启
      icon: "🛒",
      id: "purchase_notification" as NotificationKey,
      label: "购买开放通知"
    },
    {
      description: "当 Opus 模型状态发生变化时推送提醒",
      enabled: userPreference?.opus_notification ?? true, // 默认开启
      icon: "🤖",
      id: "opus_notification" as NotificationKey,
      label: "Opus 模型状态通知"
    }
  ]

  const toggleSetting = async (settingId: NotificationKey) => {
    try {
      const storageManager = await getStorageManager()
      const currentPreference =
        (await storageManager.get<UserPreferenceStorage>(
          StorageDomain.USER_PREFERENCE
        )) || { account_version: AccountVersion.SHARED }

      // 切换对应的通知设置
      const updatedPreference: UserPreferenceStorage = {
        ...currentPreference,
        [settingId]: !currentPreference[settingId]
      }
      await storageManager.set(StorageDomain.USER_PREFERENCE, updatedPreference)
    } catch (error) {
      console.error("Failed to toggle notification setting:", error)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            推送通知设置
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            管理各类推送通知的开启和关闭
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {notificationSettings.map((setting) => (
          <div
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
            key={setting.id}>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-lg">{setting.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <label
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                  htmlFor={`notification-${setting.id}`}>
                  {setting.label}
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {setting.description}
                </p>
              </div>
            </div>

            {/* 自定义开关设计 */}
            <div className="flex-shrink-0">
              <button
                aria-checked={setting.enabled}
                aria-label={`切换${setting.label}`}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  setting.enabled
                    ? "bg-blue-600 focus:ring-blue-500"
                    : "bg-gray-300 dark:bg-gray-600 focus:ring-gray-500"
                }`}
                id={`notification-${setting.id}`}
                onClick={() => toggleSetting(setting.id)}
                role="switch">
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
                    setting.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
