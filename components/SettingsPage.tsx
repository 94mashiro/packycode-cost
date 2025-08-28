import { AccountTypeSwitcher } from "./AccountTypeSwitcher"
import { DeveloperPanel } from "./DeveloperPanel"
import { LogoutSection } from "./LogoutSection"
import { NotificationSettings } from "./NotificationSettings"

interface SettingsPageProps {
  onBack: () => void
  onRefresh?: () => void
}

export function SettingsPage({ onBack, onRefresh }: SettingsPageProps) {
  // 检查是否为开发环境
  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">设置</h2>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors dark:bg-gray-700 dark:hover:bg-gray-600"
          onClick={onBack}
          title="返回">
          <svg
            className="w-4 h-4 text-gray-600 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
      </div>

      {/* 设置内容 */}
      <div className="space-y-6">
        {/* 账号版本设置 */}
        <AccountTypeSwitcher
          onAccountChanged={onRefresh}
          showDescription={false}
          showNotification={false}
          variant="dropdown"
        />

        {/* 推送通知设置 */}
        <div className="border-t pt-6 dark:border-gray-700">
          <NotificationSettings />
        </div>

        {/* 登出功能 */}
        <div className="border-t pt-6 dark:border-gray-700">
          <LogoutSection onLogout={onRefresh} />
        </div>

        {/* 开发者工具 - 仅在开发环境或特殊条件下显示 */}
        {(isDevelopment || window.location.search.includes("dev=true")) && (
          <>
            <DeveloperPanel />
          </>
        )}
      </div>
    </div>
  )
}
