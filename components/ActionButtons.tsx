import { useEffect, useState } from "react"

import { dynamicApiUrls } from "../api"

// 硬编码的URL（不会因账号类型变化）
const STATIC_URLS = {
  NETWORK_TEST: "https://packy.te.sb/",
  STATUS_MONITOR: "https://packy-status.te.sb/status/api"
} as const

export function ActionButtons() {
  const [dashboardUrl, setDashboardUrl] = useState<string>("")

  useEffect(() => {
    const loadUrl = async () => {
      try {
        const url = await dynamicApiUrls.getDashboardUrl()
        setDashboardUrl(url)
      } catch (error) {
        console.error("Failed to load dashboard URL:", error)
      }
    }
    loadUrl()
  }, [])

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex gap-2">
        <button
          className="group flex flex-col items-center justify-center px-2 py-2.5 text-xs font-medium text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200 flex-1"
          onClick={() =>
            dashboardUrl && chrome.tabs.create({ url: dashboardUrl })
          }
          style={{
            backgroundColor: "rgb(209, 116, 85)",
            borderColor: "rgb(209, 116, 85)"
          }}
          title="前往 PackyCode 管理控制台">
          <svg className="w-4 h-4 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              clipRule="evenodd"
              d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
              fillRule="evenodd"
            />
          </svg>
          <span className="font-medium">控制台</span>
        </button>

        <button
          className="group flex flex-col items-center justify-center px-2 py-2.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 flex-1"
          onClick={() => chrome.tabs.create({ url: STATIC_URLS.NETWORK_TEST })}
          title="实时监测 API 响应时间与网络连接质量">
          <svg className="w-4 h-4 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              clipRule="evenodd"
              d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.242 0 1 1 0 01-1.415-1.414 5 5 0 017.072 0 1 1 0 01-1.415 1.414zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
              fillRule="evenodd"
            />
          </svg>
          <span className="font-medium">延迟监控</span>
        </button>

        {/* <button
          className="group flex flex-col items-center justify-center px-2 py-2.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all duration-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
          onClick={() =>
            chrome.tabs.create({ url: STATIC_URLS.STATUS_MONITOR })
          }
          title="查看服务可用性状态与历史运行数据">
          <svg className="w-4 h-4 mb-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              clipRule="evenodd"
              d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              fillRule="evenodd"
            />
          </svg>
          <span className="font-medium">监控</span>
        </button> */}
      </div>
    </div>
  )
}
