import { useState } from "react"

import { devTools, type ValidationResult } from "../dev-tools"

export function DeveloperPanel() {
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [testResults, setTestResults] = useState<string>("")

  /**
   * 格式化验证结果为可读文本
   */
  const formatValidationResults = (results: ValidationResult[]): string => {
    let output = ""

    results.forEach((result) => {
      output += `\n🔍 ${result.validatorId} (${result.timestamp.toLocaleTimeString()})\n`
      output += `${result.success ? "✅" : "❌"} ${result.summary}\n`

      if (result.issues.length > 0) {
        result.issues.forEach((issue) => {
          const icon =
            issue.level === "error"
              ? "❌"
              : issue.level === "warning"
                ? "⚠️"
                : "ℹ️"
          output += `  ${icon} ${issue.message}\n`
          if (issue.suggestion) {
            output += `     💡 ${issue.suggestion}\n`
          }
        })
      }
      output += "\n"
    })

    return output
  }

  const handleRunTests = async () => {
    setIsTestRunning(true)
    setTestResults("🚀 开始运行测试...\n")

    try {
      const results = await devTools.validateAll()
      const formattedResults = formatValidationResults(results)
      setTestResults(formattedResults)
    } catch (error) {
      setTestResults(
        `❌ 测试执行失败: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsTestRunning(false)
    }
  }

  const handleTestPermissions = async () => {
    try {
      const result = await devTools.validatePermissions()
      const formatted = formatValidationResults([result])
      setTestResults(formatted)
    } catch (error) {
      setTestResults(`❌ 权限测试异常: ${error}`)
    }
  }

  const handleValidateUrls = async () => {
    try {
      const result = await devTools.validateApiConfig()
      const formatted = formatValidationResults([result])
      setTestResults(formatted)
    } catch (error) {
      setTestResults(`❌ API配置验证异常: ${error}`)
    }
  }

  const handleValidateConfigs = async () => {
    try {
      const result = await devTools.validateAccountSwitching()
      const formatted = formatValidationResults([result])
      setTestResults(formatted)
    } catch (error) {
      setTestResults(`❌ 账号切换验证异常: ${error}`)
    }
  }

  const clearResults = () => {
    setTestResults("")
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          开发者工具
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          仅开发环境
        </span>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            className="px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isTestRunning}
            onClick={handleRunTests}>
            {isTestRunning ? "测试中..." : "完整测试"}
          </button>

          <button
            className="px-3 py-2 text-xs font-medium text-purple-700 bg-purple-100 border border-purple-200 rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors dark:bg-purple-900 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-800"
            onClick={handleTestPermissions}>
            权限测试
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            onClick={handleValidateConfigs}>
            账号切换
          </button>

          <button
            className="px-3 py-2 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors dark:bg-green-900 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-800"
            onClick={handleValidateUrls}>
            API验证
          </button>
        </div>

        {testResults && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                测试结果
              </span>
              <button
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={clearResults}>
                清除
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                {testResults}
              </pre>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• 完整测试：运行所有验证器，全面检查系统配置</p>
          <p>• 权限测试：验证Chrome扩展权限和网络访问</p>
          <p>• API验证：检查API配置和基础URL</p>
          <p>• 账号切换：验证滴滴车/共享模式切换逻辑</p>
          <p>• 🆕 统一接口：问题分级显示，提供修复建议</p>
        </div>
      </div>
    </div>
  )
}
