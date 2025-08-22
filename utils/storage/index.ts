import { Storage } from "@plasmohq/storage"

import { loggers } from "~/lib/logger"

import { AccountVersion, type UserPreferenceStorage } from "../../types"
import { VersionedStorageManager } from "./VersionedStorageManager"

const logger = loggers.storage

// 全局存储管理器实例 (Linus 建议的工厂模式，避免单例问题)
let globalStorageManager: null | VersionedStorageManager = null

/**
 * 创建存储管理器 (测试友好版本)
 *
 * 用于单元测试和特殊场景，支持依赖注入
 */
export function createStorageManager(
  storage: Storage,
  version: AccountVersion
): VersionedStorageManager {
  return new VersionedStorageManager(storage, version)
}

/**
 * 获取全局存储管理器实例
 *
 * 特性:
 * 1. 懒加载 - 第一次调用时初始化
 * 2. 版本感知 - 启动时从存储中读取当前版本
 * 3. 单例模式 - 但支持测试时重置
 */
export async function getStorageManager(): Promise<VersionedStorageManager> {
  if (globalStorageManager) {
    return globalStorageManager
  }

  const storage = new Storage()

  // 从存储中读取当前版本，默认为 SHARED
  const userPref = await storage.get<UserPreferenceStorage>(
    "global.user.preference"
  )
  const currentVersion = userPref?.account_version || AccountVersion.SHARED

  logger.info(`Initializing storage manager with version: ${currentVersion}`)

  globalStorageManager = new VersionedStorageManager(storage, currentVersion)
  return globalStorageManager
}

/**
 * 检查是否已初始化
 */
export function isStorageManagerInitialized(): boolean {
  return globalStorageManager !== null
}

/**
 * 重置全局存储管理器 (仅用于测试)
 */
export function resetStorageManager(): void {
  if (globalStorageManager) {
    globalStorageManager.clearAllSubscribers()
    globalStorageManager = null
    logger.debug("Global storage manager reset")
  }
}
