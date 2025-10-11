/**
 * StorageAdapter - 底层存储抽象层
 *
 * 核心职责：
 * 1. 封装 Plasmo Storage API，提供类型安全的接口
 * 2. 统一底层存储访问，避免抽象泄漏
 * 3. 为测试和模拟提供接口替换能力
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "最小化接口，避免过度抽象"
 * ⚛️ Dan: "清晰的类型约束和错误处理"
 * ☕ Bloch: "接口隔离原则，只暴露必要方法"
 * 🏛️ Fowler: "适配器模式，隔离第三方依赖"
 *
 * @since v3.1.0
 */

import type { Storage } from "@plasmohq/storage"

import { loggers } from "~/lib/logger"

const logger = loggers.storage

/**
 * 存储适配器接口
 *
 * 定义最小化的存储操作集合
 */
export interface IStorageAdapter {
  /**
   * 获取存储值
   * @param key 存储键
   * @returns 存储值，如果不存在则返回 null
   */
  get<T>(key: string): Promise<null | T>

  /**
   * 删除存储值
   * @param key 存储键
   */
  remove(key: string): Promise<void>

  /**
   * 设置存储值
   * @param key 存储键
   * @param value 存储值
   */
  set<T>(key: string, value: T): Promise<void>
}

/**
 * Plasmo Storage 适配器实现
 *
 * 封装 Plasmo Storage API，提供类型安全访问
 */
export class PlasmoStorageAdapter implements IStorageAdapter {
  private storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
    logger.debug("PlasmoStorageAdapter initialized")
  }

  /**
   * 获取存储值
   */
  async get<T>(key: string): Promise<null | T> {
    try {
      const value = await this.storage.get<T>(key)
      return value ?? null
    } catch (error) {
      logger.error(`StorageAdapter get error for key "${key}":`, error)
      return null
    }
  }

  /**
   * 获取底层 Storage 实例（高级用法）
   *
   * ⚠️ 注意：直接使用底层 Storage 会绕过适配器
   * 仅在特殊场景下使用（如 watch 功能）
   */
  getUnderlyingStorage(): Storage {
    return this.storage
  }

  /**
   * 删除存储值
   */
  async remove(key: string): Promise<void> {
    try {
      await this.storage.remove(key)
      logger.debug(`StorageAdapter remove: ${key}`)
    } catch (error) {
      logger.error(`StorageAdapter remove error for key "${key}":`, error)
      throw error
    }
  }

  /**
   * 设置存储值
   */
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await this.storage.set(key, value)
      logger.debug(`StorageAdapter set: ${key}`)
    } catch (error) {
      logger.error(`StorageAdapter set error for key "${key}":`, error)
      throw error
    }
  }
}

/**
 * 创建 StorageAdapter 实例的工厂函数
 *
 * @param storage Plasmo Storage 实例
 * @returns StorageAdapter 实例
 */
export function createStorageAdapter(storage: Storage): IStorageAdapter {
  return new PlasmoStorageAdapter(storage)
}
