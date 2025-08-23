import { Storage } from "@plasmohq/storage"

import { loggers } from "~/lib/logger"

import { StorageManager } from "./storageManager"

const logger = loggers.storage

// 全局存储管理器实例 (Linus 建议的工厂模式，避免单例问题)
let globalStorageManager: null | StorageManager = null
let initializationPromise: null | Promise<StorageManager> = null

/**
 * 获取全局存储管理器实例
 *
 * 特性:
 * 1. 懒加载 - 第一次调用时初始化
 * 2. 版本感知 - 启动时从存储中读取当前版本
 * 3. 单例模式 - 支持并发调用，避免竞态条件
 */
export async function getStorageManager(): Promise<StorageManager> {
  // 如果已经初始化完成，直接返回
  if (globalStorageManager) {
    return globalStorageManager
  }

  // 如果正在初始化，等待初始化完成
  if (initializationPromise) {
    logger.debug("Waiting for ongoing StorageManager initialization...")
    return initializationPromise
  }

  // 开始初始化
  logger.debug("Starting StorageManager initialization...")
  initializationPromise = (async () => {
    const storage = new Storage()
    const manager = new StorageManager(storage)

    // 等待异步初始化完成（从存储中读取版本并设置监听）
    await manager.initialize()

    globalStorageManager = manager
    initializationPromise = null // 清理初始化 Promise

    return manager
  })()

  return initializationPromise
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
    // Plasmo Storage 会自动处理监听清理，无需手动清理
    globalStorageManager = null
    logger.debug("Global storage manager reset")
  }
  // 也清理初始化 Promise
  initializationPromise = null
}
