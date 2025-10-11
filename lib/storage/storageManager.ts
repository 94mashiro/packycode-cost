import { Storage } from "@plasmohq/storage"
import { merge } from "lodash"

import { loggers } from "~/lib/logger"

import { StorageDomain } from "./domains"

const logger = loggers.storage

/**
 * StorageManager - 简化的存储管理器
 *
 * v3.5.0+ 重构：移除版本感知逻辑
 * - 账号特定数据 → MultiAccountStorageManager
 * - 全局数据 → StorageManager (本类)
 *
 * 核心职责：
 * 1. 封装 Plasmo Storage API
 * 2. 提供深度合并功能
 * 3. 统一错误处理和日志记录
 *
 * @deprecated account_version 相关逻辑已移除
 * 业务逻辑请使用 account.site 字段
 */
export class StorageManager {
  private _storage: Storage

  constructor(storage: Storage) {
    this._storage = storage
    logger.info("StorageManager created (global data only)")
  }

  /**
   * 受控的数据操作 API
   */
  async get<T>(domain: string): Promise<null | T> {
    try {
      const result = await this._storage.get<T>(domain)
      logger.debug(`Storage get: ${domain} ->`, result ? "found" : "null")
      return result
    } catch (error) {
      logger.error(`Storage get error for key ${domain}:`, error)
      return null
    }
  }

  /**
   * 异步初始化（保留接口兼容性，但不再执行版本加载）
   */
  async initialize(): Promise<void> {
    logger.info("StorageManager initialized (no version loading)")
  }

  async remove(domain: string): Promise<void> {
    try {
      await this._storage.remove(domain)
      logger.debug(`Storage remove: ${domain}`)
    } catch (error) {
      logger.error(`Storage remove error for key ${domain}:`, error)
      throw error
    }
  }

  async set<T>(domain: string, value: T, override = false): Promise<void> {
    try {
      // 强制覆盖模式：直接设置值，不合并
      if (override) {
        await this._storage.set(domain, value)
        logger.debug(`Storage set (override): ${domain}`)
        return
      }

      // 如果 value 是 null 或 undefined，直接覆盖（清理数据场景）
      // 如果 value 不是对象，直接覆盖（基础类型场景）
      if (value === null || value === undefined || typeof value !== "object") {
        await this._storage.set(domain, value)
        logger.debug(`Storage set (direct): ${domain}`)
        return
      }

      // 对于对象类型，获取现有数据并进行深度合并
      const existingData = await this._storage.get<T>(domain)
      const finalValue =
        existingData && typeof existingData === "object"
          ? merge({}, existingData, value) // 使用 lodash merge 实现深度合并
          : value

      await this._storage.set(domain, finalValue)
      logger.debug(`Storage set (deep merged): ${domain}`)
    } catch (error) {
      logger.error(`Storage set error for key ${domain}:`, error)
      throw error
    }
  }

  /**
   * 数据监听 - 简化版本，直接传递给底层 Storage
   */
  watch(
    watchConfig: Record<
      string,
      (change?: { newValue?: unknown; oldValue?: unknown }) => void
    >
  ): void {
    this._storage.watch(watchConfig)
    logger.debug(
      `Registered ${Object.keys(watchConfig).length} watch listeners`
    )
  }
}
