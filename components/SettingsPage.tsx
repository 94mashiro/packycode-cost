import { AccountSwitcher } from "./AccountSwitcher"
import { DeveloperPanel } from "./DeveloperPanel"
import { LogoutSection } from "./LogoutSection"

interface SettingsPageProps {
  onBack: () => void
  onRefresh?: () => void
}

export function SettingsPage({ onBack, onRefresh }: SettingsPageProps) {
  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <div className="flex flex-col space-y-6 p-6">
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

      <div className="space-y-6">
        <AccountSwitcher onAccountChanged={onRefresh} />

        <div className="border-t pt-6 dark:border-gray-700">
          <LogoutSection onLogout={onRefresh} />
        </div>

        {(isDevelopment || window.location.search.includes("dev=true")) && (
          <>
            <DeveloperPanel />
          </>
        )}
      </div>
    </div>
  )
}
