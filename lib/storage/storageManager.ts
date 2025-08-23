import { Storage } from "@plasmohq/storage"

import { loggers } from "~/lib/logger"

import { AccountVersion, type UserPreferenceStorage } from "../../types"
import { StorageDomain } from "./domains"

const logger = loggers.storage

export class StorageManager {
  private activeWatchers = new Map<string, () => void>()
  private currentVersion: AccountVersion
  private domainChangeCallbacks = new Map<string, Set<() => void>>()
  private storage: Storage
  private versionChangeCallbacks = new Set<(version: AccountVersion) => void>()

  constructor(storage: Storage, initialVersion: AccountVersion) {
    this.storage = storage
    this.currentVersion = initialVersion
    logger.info(`StorageManager initialized with version: ${initialVersion}`)
  }

  clearAllSubscribers(): void {
    this.versionChangeCallbacks.clear()
    this.domainChangeCallbacks.clear()

    // 清理所有 Plasmo Storage watchers
    this.activeWatchers.forEach((cleanup) => {
      try {
        cleanup()
      } catch (error) {
        logger.error("Error cleaning up watcher:", error)
      }
    })
    this.activeWatchers.clear()

    logger.debug("Cleared all subscribers and watchers")
  }

  async get<T>(domain: string): Promise<null | T> {
    const key = this.getStorageKey(domain)
    try {
      const result = await this.storage.get<T>(key)
      logger.debug(`Storage get: ${key} ->`, result ? "found" : "null")
      return result
    } catch (error) {
      logger.error(`Storage get error for key ${key}:`, error)
      return null
    }
  }

  getCurrentVersion(): AccountVersion {
    return this.currentVersion
  }

  /**
   * 监听特定域的数据变化（版本感知）
   *
   * 使用 Plasmo Storage API 进行监听，避免直接操作 Chrome API
   *
   * @param domain 存储域
   * @param callback 变化时的回调函数
   * @returns 清理函数
   */
  onDomainChange(domain: string, callback: () => void): () => void {
    if (!this.domainChangeCallbacks.has(domain)) {
      this.domainChangeCallbacks.set(domain, new Set())
    }

    const callbacks = this.domainChangeCallbacks.get(domain)
    if (!callbacks) {
      throw new Error(`Failed to get callbacks for domain: ${domain}`)
    }
    callbacks.add(callback)

    logger.debug(`Added domain change subscriber for: ${domain}`)

    // 懒加载：第一次监听该域时才设置 Plasmo Storage watch
    if (callbacks.size === 1) {
      this.setupDomainWatch(domain)
    }

    // 返回清理函数
    return () => {
      callbacks.delete(callback)
      logger.debug(`Removed domain change subscriber for: ${domain}`)

      // 如果该域没有监听者了，清理对应的 watcher
      if (callbacks.size === 0) {
        this.cleanupDomainWatch(domain)
        this.domainChangeCallbacks.delete(domain)
      }
    }
  }

  onVersionChange(callback: (version: AccountVersion) => void): () => void {
    this.versionChangeCallbacks.add(callback)
    logger.debug(
      `🔗 [StorageManager] Added version change subscriber (total: ${this.versionChangeCallbacks.size})`
    )

    return () => {
      this.versionChangeCallbacks.delete(callback)
      logger.debug(
        `🗑️ [StorageManager] Removed version change subscriber (remaining: ${this.versionChangeCallbacks.size})`
      )
    }
  }

  async set<T>(domain: string, value: T): Promise<void> {
    const key = this.getStorageKey(domain)
    try {
      await this.storage.set(key, value)
      logger.debug(`Storage set: ${key}`)
    } catch (error) {
      logger.error(`Storage set error for key ${key}:`, error)
      throw error
    }
  }

  async setCurrentVersion(version: AccountVersion): Promise<void> {
    const oldVersion = this.currentVersion
    this.currentVersion = version

    logger.info(
      `🔄 [StorageManager] Version switching: ${oldVersion} -> ${version}`
    )
    logger.debug(
      `📊 [StorageManager] Active version change callbacks: ${this.versionChangeCallbacks.size}`
    )

    try {
      const currentPref =
        (await this.storage.get<UserPreferenceStorage>(
          StorageDomain.USER_PREFERENCE
        )) || {}
      await this.storage.set(StorageDomain.USER_PREFERENCE, {
        ...currentPref,
        account_version: version
      })
      logger.debug(
        `💾 [StorageManager] Updated user preference with new version: ${version}`
      )
    } catch (error) {
      logger.error(
        "❌ [StorageManager] Failed to update user preference:",
        error
      )
    }

    if (oldVersion !== version) {
      logger.info(
        `🔔 [StorageManager] Notifying ${this.versionChangeCallbacks.size} version change callbacks`
      )

      let callbackIndex = 0
      this.versionChangeCallbacks.forEach((callback) => {
        callbackIndex++
        try {
          logger.debug(
            `📨 [StorageManager] Calling version change callback ${callbackIndex}/${this.versionChangeCallbacks.size}`
          )
          callback(version)
          logger.debug(
            `✅ [StorageManager] Version change callback ${callbackIndex} completed`
          )
        } catch (error) {
          logger.error(
            `❌ [StorageManager] Version change callback ${callbackIndex} error:`,
            error
          )
        }
      })
      logger.info(`🎉 [StorageManager] All version change callbacks completed`)
    } else {
      logger.debug(`⏭️ [StorageManager] Version unchanged, skipping callbacks`)
    }
  }

  /**
   * 清理域监听
   */
  private cleanupDomainWatch(domain: string): void {
    const cleanup = this.activeWatchers.get(domain)
    if (cleanup) {
      cleanup()
      this.activeWatchers.delete(domain)
      logger.debug(`Cleaned up domain watch for: ${domain}`)
    }
  }

  private getStorageKey(domain: string): string {
    if (domain === StorageDomain.USER_PREFERENCE) {
      return domain
    }
    return `${this.currentVersion}.${domain}`
  }

  /**
   * 通知域变化回调
   */
  private notifyDomainCallbacks(domain: string): void {
    const callbacks = this.domainChangeCallbacks.get(domain)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback()
          logger.debug(`Notified domain change callback for: ${domain}`)
        } catch (error) {
          logger.error(`Domain change callback error for ${domain}:`, error)
        }
      })
    }
  }

  /**
   * 设置域监听（使用 Plasmo Storage watch API）
   */
  private setupDomainWatch(domain: string): void {
    const watchKeys: Record<
      string,
      (change: { newValue?: unknown; oldValue?: unknown }) => void
    > = {}
    const watcherKeys: string[] = []

    // 监听当前版本的域
    const currentKey = this.getStorageKey(domain)
    watchKeys[currentKey] = () => {
      this.notifyDomainCallbacks(domain)
    }
    watcherKeys.push(currentKey)

    // 如果是版本化域，同时监听另一个版本（版本切换时需要）
    if (domain !== StorageDomain.USER_PREFERENCE) {
      const otherVersion =
        this.currentVersion === AccountVersion.SHARED
          ? AccountVersion.PRIVATE
          : AccountVersion.SHARED
      const otherKey = `${otherVersion}.${domain}`

      watchKeys[otherKey] = () => {
        this.notifyDomainCallbacks(domain)
      }
      watcherKeys.push(otherKey)
    }

    // 使用 Plasmo Storage watch API
    try {
      this.storage.watch(watchKeys)
      logger.debug(
        `Setup Plasmo Storage watch for domain: ${domain}, keys: ${watcherKeys.join(", ")}`
      )

      // 存储清理函数（Plasmo Storage 的 watch 返回清理函数的方式可能不同，这里做兼容处理）
      const cleanup = () => {
        // Plasmo Storage 的 watch API 可能需要特殊的清理方式
        // 这里我们通过重新设置空的 watch 来清理
        const emptyWatch: Record<
          string,
          (change: { newValue?: unknown; oldValue?: unknown }) => void
        > = {}
        watcherKeys.forEach((key) => {
          emptyWatch[key] = () => {} // 空回调
        })
        this.storage.watch(emptyWatch)
        logger.debug(`Cleaned up Plasmo Storage watch for domain: ${domain}`)
      }

      this.activeWatchers.set(domain, cleanup)
    } catch (error) {
      logger.error(`Failed to setup watch for domain ${domain}:`, error)
    }
  }
}
