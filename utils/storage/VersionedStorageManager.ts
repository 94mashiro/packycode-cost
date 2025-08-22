import { Storage } from "@plasmohq/storage"

import { loggers } from "~/lib/logger"

import { AccountVersion, type UserPreferenceStorage } from "../../types"

const logger = loggers.storage

export class VersionedStorageManager {
  private currentVersion: AccountVersion
  private storage: Storage
  private versionChangeCallbacks = new Set<(version: AccountVersion) => void>()

  constructor(storage: Storage, initialVersion: AccountVersion) {
    this.storage = storage
    this.currentVersion = initialVersion
    logger.info(
      `VersionedStorageManager initialized with version: ${initialVersion}`
    )
  }

  clearAllSubscribers(): void {
    this.versionChangeCallbacks.clear()
    logger.debug("Cleared all version change subscribers")
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

  onVersionChange(callback: (version: AccountVersion) => void): () => void {
    this.versionChangeCallbacks.add(callback)
    logger.debug("Added version change subscriber")

    return () => {
      this.versionChangeCallbacks.delete(callback)
      logger.debug("Removed version change subscriber")
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

    logger.info(`Version switched: ${oldVersion} -> ${version}`)

    try {
      const currentPref =
        (await this.storage.get<UserPreferenceStorage>(
          "global.user.preference"
        )) || {}
      await this.storage.set("global.user.preference", {
        ...currentPref,
        account_version: version
      })
    } catch (error) {
      logger.error("Failed to update user preference:", error)
    }

    if (oldVersion !== version) {
      this.versionChangeCallbacks.forEach((callback) => {
        try {
          callback(version)
        } catch (error) {
          logger.error("Version change callback error:", error)
        }
      })
    }
  }

  private getStorageKey(domain: string): string {
    if (domain.startsWith("global.")) {
      return domain
    }
    return `${this.currentVersion}.${domain}`
  }
}
