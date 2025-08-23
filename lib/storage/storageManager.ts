import { Storage } from "@plasmohq/storage"
import { merge } from "lodash"

import { loggers } from "~/lib/logger"

import { AccountVersion, type UserPreferenceStorage } from "../../types"
import { StorageDomain } from "./domains"

const logger = loggers.storage

/**
 * StorageManager - 版本感知的存储管理器
 *
 * 核心职责：抹平 AccountVersion 给 storage key 带来的差异
 * 让业务方能够无感知地操作正确版本的数据
 *
 * 设计原则：
 * 1. Version 是存储中的数据，通过 watch 监听变化
 * 2. 版本变化时自动同步内部状态
 * 3. 其他功能直接复用 Plasmo Storage 能力
 */
export class StorageManager {
  private _storage: Storage
  private currentVersion: AccountVersion = AccountVersion.SHARED
  private versionChangeCallbacks = new Set<(version: AccountVersion) => void>()

  constructor(storage: Storage) {
    this._storage = storage
    logger.info("StorageManager created, version will be loaded asynchronously")
  }

  /**
   * 受控的数据操作 API - 仅暴露必要的操作
   * 防止业务方绕过版本抽象
   */
  async get<T>(domain: string): Promise<null | T> {
    const key = this.getVersionedKey(domain)
    try {
      const result = await this._storage.get<T>(key)
      logger.debug(`Storage get: ${key} ->`, result ? "found" : "null")
      return result
    } catch (error) {
      logger.error(`Storage get error for key ${key}:`, error)
      return null
    }
  }

  /**
   * 获取当前版本（同步方法，供业务查询）
   */
  getCurrentVersion(): AccountVersion {
    return this.currentVersion
  }

  /**
   * 异步初始化 - 从存储中读取当前版本并设置监听
   */
  async initialize(): Promise<void> {
    await this.loadVersionFromStorage()
    this.setupVersionWatch()
    logger.info(
      `StorageManager initialized with version: ${this.currentVersion}`
    )
  }

  async remove(domain: string): Promise<void> {
    const key = this.getVersionedKey(domain)
    try {
      // Plasmo Storage 使用 set(key, undefined) 来删除
      await this._storage.set(key, undefined)
      logger.debug(`Storage remove: ${key}`)
    } catch (error) {
      logger.error(`Storage remove error for key ${key}:`, error)
      throw error
    }
  }

  async set<T>(domain: string, value: T, override = false): Promise<void> {
    const key = this.getVersionedKey(domain)
    try {
      // 强制覆盖模式：直接设置值，不合并
      if (override) {
        await this._storage.set(key, value)
        logger.debug(`Storage set (override): ${key}`)
        return
      }

      // 如果 value 是 null 或 undefined，直接覆盖（清理数据场景）
      // 如果 value 不是对象，直接覆盖（基础类型场景）
      if (value === null || value === undefined || typeof value !== "object") {
        await this._storage.set(key, value)
        logger.debug(`Storage set (direct): ${key}`)
        return
      }

      // 对于对象类型，获取现有数据并进行深度合并
      const existingData = await this._storage.get<T>(key)
      const finalValue =
        existingData && typeof existingData === "object"
          ? merge({}, existingData, value) // 使用 lodash merge 实现深度合并
          : value

      await this._storage.set(key, finalValue)
      logger.debug(`Storage set (deep merged): ${key}`)
    } catch (error) {
      logger.error(`Storage set error for key ${key}:`, error)
      throw error
    }
  }

  /**
   * 版本感知的数据监听 - 自动处理版本切换
   * API 与 Plasmo Storage watch 保持一致，但内部处理版本变化
   */
  watch(
    watchConfig: Record<
      string,
      (change?: { newValue?: unknown; oldValue?: unknown }) => void
    >
  ): void {
    const activeWatchers = new Map<string, () => void>()

    // 设置监听的函数
    const setupWatchers = () => {
      // 清理旧的监听器
      activeWatchers.forEach((cleanup) => cleanup())
      activeWatchers.clear()

      // 为每个域设置新的版本化监听
      const versionedWatchConfig: Record<
        string,
        (change?: { newValue?: unknown; oldValue?: unknown }) => void
      > = {}

      Object.entries(watchConfig).forEach(([domain, callback]) => {
        const versionedKey = this.getVersionedKey(domain)
        versionedWatchConfig[versionedKey] = callback
        logger.debug(`Setup watch: ${domain} -> ${versionedKey}`)
      })

      this._storage.watch(versionedWatchConfig)
    }

    // 初始设置
    setupWatchers()

    // 监听版本变化，重新设置所有监听器
    this.onVersionChange(() => {
      logger.debug("Version changed, updating all watchers")
      setupWatchers()

      // 版本切换后，通知所有回调数据可能已变化
      Object.values(watchConfig).forEach((callback) => {
        callback({ newValue: undefined, oldValue: undefined })
      })
    })

    // 存储清理函数（注意：这里无法返回清理函数，因为要保持与 Plasmo API 一致）
    // 实际项目中可能需要提供单独的清理方法，或者在组件卸载时自动清理
  }

  /**
   * 核心功能：生成版本感知的存储键
   * 这是 StorageManager 存在的唯一理由
   * @private 内部实现细节，遵循最小权限原则
   */
  private getVersionedKey(domain: string): string {
    if (domain === StorageDomain.USER_PREFERENCE) {
      return domain // 用户偏好全局共享，不添加版本前缀
    }
    return `${this.currentVersion}.${domain}` // 其他域按版本隔离
  }

  /**
   * 从存储中加载版本信息
   */
  private async loadVersionFromStorage(): Promise<void> {
    try {
      const pref = await this._storage.get<UserPreferenceStorage>(
        StorageDomain.USER_PREFERENCE
      )
      this.currentVersion = pref?.account_version || AccountVersion.SHARED
      logger.debug(`Loaded version from storage: ${this.currentVersion}`)
    } catch (error) {
      logger.error("Failed to load version from storage:", error)
      this.currentVersion = AccountVersion.SHARED // 故障回退
    }
  }

  /**
   * 监听版本变化 - 解决版本切换后数据不更新的问题
   * @private 内部使用，遵循最小权限原则
   */
  private onVersionChange(
    callback: (version: AccountVersion) => void
  ): () => void {
    this.versionChangeCallbacks.add(callback)
    logger.debug(
      `Added version change subscriber (total: ${this.versionChangeCallbacks.size})`
    )

    return () => {
      this.versionChangeCallbacks.delete(callback)
      logger.debug(
        `Removed version change subscriber (remaining: ${this.versionChangeCallbacks.size})`
      )
    }
  }

  /**
   * 监听用户偏好变化，自动同步版本状态
   * 这是响应式设计的核心：version 变更 -> 内部状态同步
   */
  private setupVersionWatch(): void {
    const watchKeys: Record<string, () => void> = {}

    watchKeys[StorageDomain.USER_PREFERENCE] = () => {
      this.syncVersionFromStorage()
    }

    this._storage.watch(watchKeys)
    logger.debug("✅ Version watch setup completed")
  }

  /**
   * 同步版本状态（当检测到用户偏好变化时）
   */
  private async syncVersionFromStorage(): Promise<void> {
    try {
      const pref = await this._storage.get<UserPreferenceStorage>(
        StorageDomain.USER_PREFERENCE
      )
      const newVersion = pref?.account_version || AccountVersion.SHARED

      if (newVersion !== this.currentVersion) {
        const oldVersion = this.currentVersion
        this.currentVersion = newVersion
        logger.info(`🔄 Version auto-sync: ${oldVersion} -> ${newVersion}`)

        // 注意：版本变化后，业务层需要重新获取数据
        // 这由 useStorage 等消费者通过同时监听版本变化来处理
      }
    } catch (error) {
      logger.error("❌ Version sync error:", error)
    }
  }
}
