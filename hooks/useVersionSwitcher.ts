import { useCallback, useState } from "react"

import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"

import { AccountVersion } from "../types"

const logger = loggers.ui

/**
 * 版本切换 Hook
 *
 * 提供版本切换的完整功能:
 * 1. 状态管理 - 切换进度和错误状态
 * 2. 响应式更新 - 自动触发所有相关组件重新加载数据
 * 3. 错误处理 - 统一的错误处理和恢复机制
 * 4. 性能优化 - 防止重复切换和状态混乱
 */
export function useVersionSwitcher() {
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<null | string>(null)

  /**
   * 切换到指定版本
   *
   * 该函数会:
   * 1. 更新存储管理器的当前版本
   * 2. 保存版本偏好到全局存储
   * 3. 触发所有使用 useVersionedStorage 的组件重新加载数据
   * 4. 处理切换过程中的错误
   *
   * @param newVersion 要切换到的新版本
   */
  const switchVersion = useCallback(
    async (newVersion: AccountVersion) => {
      // 防止重复切换
      if (switching) {
        logger.warn("Version switch already in progress, ignoring request")
        return
      }

      setSwitching(true)
      setError(null)
      logger.info(`Starting version switch to: ${newVersion}`)

      try {
        const storage = await getStorageManager()
        const currentVersion = storage.getCurrentVersion()

        // 检查是否需要切换
        if (currentVersion === newVersion) {
          logger.info(`Already on version ${newVersion}, no switch needed`)
          return
        }

        // 执行版本切换
        // 这会自动:
        // 1. 更新存储管理器的当前版本
        // 2. 保存全局用户偏好
        // 3. 触发版本变化回调，通知所有订阅者
        await storage.setCurrentVersion(newVersion)

        logger.info(
          `Version switch completed: ${currentVersion} -> ${newVersion}`
        )

        // 可以在这里添加额外的初始化逻辑
        // 例如: 清除缓存、重新获取数据、发送分析事件等
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "版本切换失败"
        setError(errorMessage)
        logger.error("Version switch failed:", err)

        // 可以在这里添加错误恢复逻辑
        // 例如: 回滚到之前的版本、显示用户友好的错误提示等
      } finally {
        setSwitching(false)
      }
    },
    [switching]
  )

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * 获取当前版本 (同步)
   */
  const getCurrentVersion =
    useCallback(async (): Promise<AccountVersion | null> => {
      try {
        const storage = await getStorageManager()
        return storage.getCurrentVersion()
      } catch (err) {
        logger.error("Failed to get current version:", err)
        return null
      }
    }, [])

  return {
    clearError,
    error,
    getCurrentVersion,
    switching,
    switchVersion
  }
}
