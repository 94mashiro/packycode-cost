import { Storage } from "@plasmohq/storage"

import { loggers } from "~/lib/logger"
import { AccountVersion, type UserPreferenceStorage } from "~/types"

import { StorageDomain } from "./domains"
import { StorageManager } from "./storageManager"

const logger = loggers.storage

// 全局存储管理器实例 (Linus 建议的工厂模式，避免单例问题)
let globalStorageManager: null | StorageManager = null

/**
 * 获取全局存储管理器实例
 *
 * 特性:
 * 1. 懒加载 - 第一次调用时初始化
 * 2. 版本感知 - 启动时从存储中读取当前版本
 * 3. 单例模式 - 但支持测试时重置
 */
export async function getStorageManager(): Promise<StorageManager> {
  if (globalStorageManager) {
    return globalStorageManager
  }

  const storage = new Storage()

  // 从存储中读取当前版本，默认为 SHARED
  const userPref = await storage.get<UserPreferenceStorage>(
    StorageDomain.USER_PREFERENCE
  )
  const currentVersion = userPref?.account_version || AccountVersion.SHARED

  logger.info(`Initializing storage manager with version: ${currentVersion}`)

  globalStorageManager = new StorageManager(storage, currentVersion)
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
