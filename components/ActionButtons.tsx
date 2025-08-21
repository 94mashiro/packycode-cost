import { API_URLS } from "../api"

export function ActionButtons() {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-2">
      <div className="grid grid-cols-1 gap-2">
        <button
          className="flex flex-col items-start justify-center px-3 py-3 text-sm font-medium text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
          onClick={() =>
            chrome.tabs.create({
              url: API_URLS.PACKY_DASHBOARD
            })
          }
          style={{
            backgroundColor: "rgb(209, 116, 85)",
            borderColor: "rgb(209, 116, 85)"
          }}>
          <span className="font-semibold">控制台</span>
          <span className="text-xs opacity-80 mt-1">
            前往 PackyCode 管理控制台
          </span>
        </button>
        <button
          className="flex flex-col items-start justify-center px-3 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
          onClick={() => chrome.tabs.create({ url: API_URLS.NETWORK_TEST })}>
          <span className="font-semibold">网络测速</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            实时监测 API 响应时间与网络连接质量
          </span>
        </button>
        <button
          className="flex flex-col items-start justify-center px-3 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
          onClick={() =>
            chrome.tabs.create({
              url: API_URLS.STATUS_MONITOR
            })
          }>
          <span className="font-semibold">服务监控</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            查看服务可用性状态与历史运行数据
          </span>
        </button>
      </div>
    </div>
  )
}
