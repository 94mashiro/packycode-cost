/**
 * 存储层工厂方法
 *
 * 提供统一的存储管理器访问接口，基于多账号隔离架构。
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "工厂模式避免单例问题，支持并发安全"
 * ⚛️ Dan: "清晰的 API 边界，避免混淆两种管理器"
 * ☕ Bloch: "懒加载优化性能，避免不必要的初始化"
 * 🏛️ Fowler: "Repository 模式的工厂方法实现"
 *
 * @since v3.5.0
 */

import { Storage } from "@plasmohq/storage"

import { loggers } from "~/lib/logger"

import { MultiAccountStorageManager } from "./MultiAccountStorageManager"
import { createStorageAdapter, type IStorageAdapter } from "./StorageAdapter"

const logger = loggers.storage

// ===== 多账号存储管理器 (v3.0.0+) =====

// 全局存储管理器实例
let globalStorageManager: MultiAccountStorageManager | null = null

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
 * 获取存储管理器实例
 *
 * 特性:
 * 1. 懒加载 - 第一次调用时创建
 * 2. 账号隔离 - 基于 accountId 隔离数据
 * 3. 单例模式 - 全局唯一实例
 *
 * 使用示例:
 * ```typescript
 * const manager = getStorageManager()
 * await manager.setCurrentAccount("uuid-1234")
 * const auth = await manager.get(StorageDomain.AUTH)
 * ```
 */
export function getStorageManager(): MultiAccountStorageManager {
  if (!globalStorageManager) {
    logger.debug("Creating StorageManager instance...")
    const storage = new Storage()
    globalStorageManager = new MultiAccountStorageManager(storage)
  }

  return globalStorageManager
}

/**
 * 检查存储管理器是否已初始化
 */
export function isStorageManagerInitialized(): boolean {
  return globalStorageManager !== null
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

/**
 * 重置存储管理器 (仅用于测试)
 */
export function resetStorageManager(): void {
  if (globalStorageManager) {
    globalStorageManager = null
    logger.debug("Global storage manager reset")
  }
}
