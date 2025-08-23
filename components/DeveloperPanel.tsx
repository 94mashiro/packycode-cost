import { useState } from "react"

import {
  runApiConfigManagerTests,
  testAllPermissions,
  validateApiEnvironmentConfigs,
  validateApiKeysPattern
} from "../debug"

/* eslint-disable no-console */

export function DeveloperPanel() {
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [testResults, setTestResults] = useState<string>("")

  const handleRunTests = async () => {
    setIsTestRunning(true)
    setTestResults("🚀 开始运行测试...\n")

    try {
      // 重定向console.log到结果显示
      const originalLog = console.log
      const originalError = console.error
      let results = ""

      console.log = (...args) => {
        results += args.join(" ") + "\n"
        originalLog(...args)
      }

      console.error = (...args) => {
        results += "❌ " + args.join(" ") + "\n"
        originalError(...args)
      }

      // 运行测试
      await runApiConfigManagerTests()

      // 恢复console
      console.log = originalLog
      console.error = originalError

      setTestResults(results)
    } catch (error) {
      setTestResults(
        `❌ 测试执行失败: ${error instanceof Error ? error.message : String(error)}`
      )
    } finally {
      setIsTestRunning(false)
    }
  }

  const handleTestPermissions = async () => {
    const originalLog = console.log
    const originalError = console.error
    let results = ""

    console.log = (...args) => {
      results += args.join(" ") + "\n"
      originalLog(...args)
    }

    console.error = (...args) => {
      results += "❌ " + args.join(" ") + "\n"
      originalError(...args)
    }

    try {
      const permissionResult = await testAllPermissions()
      results += permissionResult.success
        ? "\n✅ 权限测试通过"
        : "\n❌ 权限测试失败"
    } catch (error) {
      results += `\n❌ 权限测试异常: ${error}`
    }

    console.log = originalLog
    console.error = originalError

    setTestResults(results)
  }

  const handleValidateUrls = async () => {
    const originalLog = console.log
    const originalError = console.error
    let results = ""

    console.log = (...args) => {
      results += args.join(" ") + "\n"
      originalLog(...args)
    }

    console.error = (...args) => {
      results += "❌ " + args.join(" ") + "\n"
      originalError(...args)
    }

    try {
      const urlResult = await validateApiKeysPattern()
      results += urlResult.success
        ? "\n✅ URL模式验证通过"
        : "\n❌ URL模式验证失败"
    } catch (error) {
      results += `\n❌ URL验证异常: ${error}`
    }

    console.log = originalLog
    console.error = originalError

    setTestResults(results)
  }

  const handleValidateConfigs = () => {
    const originalLog = console.log
    const originalError = console.error
    let results = ""

    console.log = (...args) => {
      results += args.join(" ") + "\n"
      originalLog(...args)
    }

    console.error = (...args) => {
      results += "❌ " + args.join(" ") + "\n"
      originalError(...args)
    }

    const isValid = validateApiEnvironmentConfigs()

    console.log = originalLog
    console.error = originalError

    setTestResults(
      results + (isValid ? "\n✅ 配置验证通过" : "\n❌ 配置验证失败")
    )
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
            验证配置
          </button>

          <button
            className="px-3 py-2 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors dark:bg-green-900 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-800"
            onClick={handleValidateUrls}>
            URL验证
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
          <p>• 完整测试：验证账号类型切换和URL配置</p>
          <p>• 权限测试：验证域名访问和Cookie权限</p>
          <p>• 验证配置：检查配置结构完整性</p>
          <p>• URL验证：检查API Keys Pattern URL格式（🆕 修复重复域名问题）</p>
          <p>• 详细日志请查看浏览器开发者工具控制台</p>
        </div>
      </div>
    </div>
  )
}
