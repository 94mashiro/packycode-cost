import { Storage } from "@plasmohq/storage"
import { useEffect, useState } from "react"

import { AccountVersion } from "../types"

const storage = new Storage()

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [accountVersion, setAccountVersion] = useState<AccountVersion>(
    AccountVersion.SHARED
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // 加载存储的版本
    storage.get<AccountVersion>("account_version").then((version) => {
      if (version) {
        setAccountVersion(version)
      }
    })
  }, [])

  const handleVersionChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newVersion = e.target.value as AccountVersion
    setSaving(true)

    try {
      await storage.set("account_version", newVersion)
      setAccountVersion(newVersion)
      console.log(`[Settings] Account version changed to: ${newVersion}`)
    } catch (error) {
      console.error("[Settings] Failed to save version:", error)
    } finally {
      setSaving(false)
    }
  }

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
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="account-version">
            账号版本
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
            disabled={saving}
            id="account-version"
            onChange={handleVersionChange}
            value={accountVersion}>
            <option value={AccountVersion.SHARED}>🚌 公交车</option>
            <option value={AccountVersion.PRIVATE}>🚗 私家车</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {accountVersion === AccountVersion.SHARED
              ? "公交车版本：共享资源，价格实惠"
              : "私家车版本：独享资源，性能更优"}
          </p>
        </div>
      </div>
    </div>
  )
}
