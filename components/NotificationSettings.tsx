import { useUserPreference } from "~/hooks/infrastructure/useStorageHooks"
import { loggers } from "~/lib/logger"
import {
  getActiveAccountData,
  setActiveAccountData
} from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"
import { type NotificationKey, type UserPreferenceStorage } from "~/types"

const logger = loggers.ui

interface NotificationSettingsProps {
  className?: string
}

// 通知设置分组数据结构
interface NotificationGroup {
  description: string
  settings: Array<{
    description: string
    enabled: boolean
    icon: string
    id: NotificationKey
    label: string
  }>
  title: string
}

export function NotificationSettings({
  className = ""
}: NotificationSettingsProps) {
  const { data: userPreference } = useUserPreference()

  // 构建通知设置分组（按功能分组）
  const notificationGroups: NotificationGroup[] = [
    {
      description: "当购买功能恢复可用时推送提醒",
      settings: [
        {
          description: "主站 (www.packycode.com)",
          enabled:
            userPreference?.purchase_notification_www ??
            userPreference?.purchase_notification ??
            true,
          icon: "🚌",
          id: "purchase_notification_www",
          label: "主站"
        },
        {
          description: "拼车站 (share.packycode.com)",
          enabled:
            userPreference?.purchase_notification_shared ??
            userPreference?.purchase_notification ??
            true,
          icon: "🚗",
          id: "purchase_notification_shared",
          label: "拼车站"
        },
        {
          description: "Codex站 (codex.packycode.com)",
          enabled:
            userPreference?.purchase_notification_codex ??
            userPreference?.purchase_notification ??
            true,
          icon: "💻",
          id: "purchase_notification_codex",
          label: "Codex站"
        }
      ],
      title: "购买开放通知"
    },
    {
      description: "当 Opus 模型状态发生变化时推送提醒（仅主站）",
      settings: [
        {
          description: "主站 (www.packycode.com)",
          enabled:
            userPreference?.opus_notification_www ??
            userPreference?.opus_notification ??
            true,
          icon: "🤖",
          id: "opus_notification_www",
          label: "主站"
        }
      ],
      title: "Opus 模型状态通知"
    }
  ]

  const toggleSetting = async (settingId: NotificationKey) => {
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
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            推送通知设置
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            按站点精细化管理各类推送通知的开启和关闭
          </p>
        </div>
      </div>

      {/* 分组展示通知设置 */}
      {notificationGroups.map((group) => (
        <div className="space-y-3" key={group.title}>
          {/* 分组标题 */}
          <div className="border-l-4 border-blue-500 pl-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {group.title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {group.description}
            </p>
          </div>

          {/* 分组内的开关列表 */}
          <div className="space-y-2 pl-4">
            {group.settings.map((setting) => (
              <div
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
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

                {/* 开关按钮 */}
                <div className="flex-shrink-0">
                  <button
                    aria-checked={setting.enabled}
                    aria-label={`切换${setting.label}通知`}
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
      ))}
    </div>
  )
}
