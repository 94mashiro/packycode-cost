/**
 * 存储层工厂方法
 *
 * 提供统一的存储管理器访问接口，支持：
 * 1. 版本感知存储管理器（v2.x 向后兼容）
 * 2. 多账号存储管理器（v3.0.0+）
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "工厂模式避免单例问题，支持并发安全"
 * ⚛️ Dan: "清晰的 API 边界，避免混淆两种管理器"
 * ☕ Bloch: "懒加载优化性能，避免不必要的初始化"
 * 🏛️ Fowler: "Repository 模式的工厂方法实现"
 *
 * @since v2.0.0
 */

import { Storage } from "@plasmohq/storage"

import { loggers } from "~/lib/logger"

import { MultiAccountStorageManager } from "./MultiAccountStorageManager"
import { StorageManager } from "./storageManager"

const logger = loggers.storage

// ===== v2.x 版本感知存储管理器 (向后兼容) =====

// 全局存储管理器实例 (Linus 建议的工厂模式，避免单例问题)
let globalStorageManager: null | StorageManager = null
let initializationPromise: null | Promise<StorageManager> = null

/**
 * 获取版本感知存储管理器实例（v2.x 向后兼容）
 *
 * @deprecated v3.0.0+ 请使用 getMultiAccountStorageManager()
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
 * 检查版本感知存储管理器是否已初始化
 *
 * @deprecated v3.0.0+ 请使用 isMultiAccountStorageManagerInitialized()
 */
export function isStorageManagerInitialized(): boolean {
  return globalStorageManager !== null
}

/**
 * 重置版本感知存储管理器 (仅用于测试)
 *
 * @deprecated v3.0.0+ 请使用 resetMultiAccountStorageManager()
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

// ===== v3.0.0+ 多账号存储管理器 =====

// 全局多账号存储管理器实例
let globalMultiAccountStorageManager: MultiAccountStorageManager | null = null

/**
 * 创建默认的存储适配器实例（v3.1.0+）
 *
 * 用途：避免其他模块直接导入 @plasmohq/storage
 *
 * @returns 预配置的存储适配器实例
 *
 * @example
 * ```typescript
 * const storage = createDefaultStorageAdapter()
 * const migrationManager = new DataMigrationManager(accountManager, storage)
 * ```
 */
export function createDefaultStorageAdapter(): IStorageAdapter {
  const storage = new Storage()
  return createStorageAdapter(storage)
}

/**
 * 获取多账号存储管理器实例（v3.0.0+）
 *
 * 特性:
 * 1. 懒加载 - 第一次调用时创建
 * 2. 账号隔离 - 基于 accountId 隔离数据
 * 3. 单例模式 - 全局唯一实例
 *
 * 使用示例:
 * ```typescript
 * const manager = getMultiAccountStorageManager()
 * await manager.setCurrentAccount("uuid-1234")
 * const auth = await manager.get(StorageDomain.AUTH)
 * ```
 */
export function getMultiAccountStorageManager(): MultiAccountStorageManager {
  if (!globalMultiAccountStorageManager) {
    logger.debug("Creating MultiAccountStorageManager instance...")
    const storage = new Storage()
    globalMultiAccountStorageManager = new MultiAccountStorageManager(storage)
  }

  return globalMultiAccountStorageManager
}

/**
 * 检查多账号存储管理器是否已初始化
 */
export function isMultiAccountStorageManagerInitialized(): boolean {
  return globalMultiAccountStorageManager !== null
}

// ===== 导出所有存储相关模块 =====

export { AccountStorageKeyGenerator } from "./AccountStorageKeyGenerator"
export { StorageDomain, type StorageDomainMap } from "./domains"
export { MultiAccountStorageManager } from "./MultiAccountStorageManager"
export {
  createStorageAdapter,
  type IStorageAdapter,
  PlasmoStorageAdapter
} from "./StorageAdapter"
export { StorageManager } from "./storageManager"

/**
 * 重置多账号存储管理器 (仅用于测试)
 */
export function resetMultiAccountStorageManager(): void {
  if (globalMultiAccountStorageManager) {
    globalMultiAccountStorageManager = null
    logger.debug("Global multi-account storage manager reset")
  }
}
