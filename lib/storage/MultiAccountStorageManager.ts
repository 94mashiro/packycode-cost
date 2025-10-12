/**
 * 多账号存储管理器（无状态重构版）
 *
 * 核心设计原则：
 * 1. 完全无状态 - 不维护任何"当前账号"的概念
 * 2. 显式参数 - 所有方法都要求传入 accountId
 * 3. 职责单一 - 只负责数据的 CRUD，不管理业务逻辑
 *
 * 设计哲学 (四师协作):
 * 🐧 Linus: "底层存储应该是无状态的，像文件系统一样直接"
 * ⚛️ Dan: "显式依赖，清晰的数据流，无隐藏魔法"
 * ☕ Bloch: "让错误的用法难以发生，让正确的用法一目了然"
 * 🏛️ Fowler: "Repository 模式的纯粹实现，数据访问层不应有状态"
 *
 * @version 3.0.0 - 架构重构：移除隐式状态，所有方法显式传入 accountId
 */

import { Storage } from "@plasmohq/storage"
import { merge } from "lodash"

import type { AccountData } from "~/types"

import { loggers } from "~/lib/logger"

import { DOMAIN_TO_FIELD_MAP, StorageDomain } from "./domains"

const logger = loggers.storage

export class MultiAccountStorageManager {
  private _storage: Storage

  constructor(storage: Storage) {
    this._storage = storage
    logger.info("MultiAccountStorageManager created (stateless)")
  }

  /**
   * 清空指定账号的所有数据
   *
   * 用途：账号删除、数据清理
   * 策略：删除账号的聚合数据键
   *
   * @param accountId 账号ID
   *
   * @example
   * ```typescript
   * await manager.clearAccountData("uuid-1234")
   * ```
   */
  async clearAccountData(accountId: string): Promise<void> {
    try {
      const key = `account_${accountId}_info`
      await this._storage.remove(key)
      logger.info(`🗑️ Cleared account data: ${key}`)
    } catch (error) {
      logger.error(`Failed to clear account data for ${accountId}:`, error)
      throw error
    }
  }

  /**
   * 获取指定账号的数据（统一API）
   *
   * 设计原则：
   * - 显式传入 accountId，消除隐式依赖
   * - 从聚合键 `account_{id}_info` 读取并提取指定字段
   * - 统一了旧的 get() 和 getForAccount() 两个方法
   *
   * @param accountId 账号ID（必须显式传入）
   * @param domain 存储域
   * @returns 数据或 null
   *
   * @example
   * ```typescript
   * const auth = await manager.get(accountId, StorageDomain.AUTH)
   * ```
   */
  async get<T>(accountId: string, domain: string): Promise<null | T> {
    try {
      const accountData = await this.getAccountData(accountId)

      if (!accountData) {
        logger.debug(`No account data found for: ${accountId}`)
        return null
      }

      const field = this.domainToField(domain)
      const result = accountData[field] as null | T

      logger.debug(
        `Storage get: ${accountId}.${domain} ->`,
        result ? "found" : "null"
      )
      return result
    } catch (error) {
      logger.error(`Storage get error for ${accountId}.${domain}:`, error)
      return null
    }
  }

  /**
   * 获取所有账号ID列表
   *
   * @returns 账号ID列表
   *
   * @example
   * ```typescript
   * const accountIds = await manager.getAllAccountIds()
   * ```
   */
  async getAllAccountIds(): Promise<string[]> {
    try {
      const registry = await this._storage.get<{
        accounts: Array<{ id: string }>
      }>(StorageDomain.ACCOUNT_REGISTRY)

      if (!registry || !Array.isArray(registry.accounts)) {
        logger.debug("No account registry found, returning empty list")
        return []
      }

      return registry.accounts.map((account) => account.id)
    } catch (error) {
      logger.error("Failed to get all account IDs:", error)
      return []
    }
  }

  /**
   * 获取底层 Plasmo Storage 实例（高级用法）
   *
   * ⚠️ 注意：直接操作底层存储会绕过账号隔离机制
   * 仅在特殊场景下使用（如迁移、调试）
   *
   * @returns Plasmo Storage 实例
   */
  getUnderlyingStorage(): Storage {
    return this._storage
  }

  /**
   * 删除指定账号的数据（统一API）
   *
   * 设计原则：
   * - 显式传入 accountId，消除隐式依赖
   * - 设置字段为 null（保留数据结构）
   * - RMW模式更新聚合对象
   *
   * @param accountId 账号ID（必须显式传入）
   * @param domain 存储域
   */
  async remove(accountId: string, domain: string): Promise<void> {
    try {
      const accountData = await this.getAccountData(accountId)

      if (!accountData) {
        logger.debug(`No account data to remove for: ${accountId}`)
        return
      }

      const field = this.domainToField(domain)
      this.setAccountDataField(accountData, field, null)

      await this.setAccountData(accountData, accountId)
      logger.debug(`Storage remove: ${accountId}.${domain}`)
    } catch (error) {
      logger.error(`Storage remove error for ${accountId}.${domain}:`, error)
      throw error
    }
  }

  /**
   * 设置指定账号的数据（统一API）
   *
   * 设计原则：
   * - 显式传入 accountId，消除隐式依赖
   * - RMW 模式更新聚合对象
   * - 支持深度合并（默认）或强制覆盖
   * - 统一了旧的 set() 和 setForAccount() 两个方法
   *
   * @param accountId 账号ID（必须显式传入）
   * @param domain 存储域
   * @param value 数据值
   * @param override 是否覆盖（默认深度合并）
   */
  async set<T>(
    accountId: string,
    domain: string,
    value: T,
    override = false
  ): Promise<void> {
    try {
      // 1. Read: 读取完整账号数据
      let accountData = await this.getAccountData(accountId)

      if (!accountData) {
        accountData = this.createEmptyAccountData()
        logger.debug("Created new account data object")
      }

      const field = this.domainToField(domain)

      // 2. Modify: 修改指定字段
      if (override) {
        // 强制覆盖模式
        this.setAccountDataField(
          accountData,
          field,
          value as AccountData[typeof field]
        )
        logger.debug(`Storage set (override): ${accountId}.${domain}`)
      } else if (
        value === null ||
        value === undefined ||
        typeof value !== "object"
      ) {
        // 基础类型或 null/undefined：直接覆盖
        this.setAccountDataField(
          accountData,
          field,
          value as AccountData[typeof field]
        )
        logger.debug(`Storage set (direct): ${accountId}.${domain}`)
      } else {
        // 对象类型：深度合并
        const existingValue = accountData[field]
        if (existingValue && typeof existingValue === "object") {
          const mergedValue = merge(
            {},
            existingValue,
            value
          ) as AccountData[typeof field]
          this.setAccountDataField(accountData, field, mergedValue)
          logger.debug(`Storage set (deep merged): ${accountId}.${domain}`)
        } else {
          this.setAccountDataField(
            accountData,
            field,
            value as AccountData[typeof field]
          )
          logger.debug(`Storage set (initial): ${accountId}.${domain}`)
        }
      }

      // 3. Write: 写回完整数据
      await this.setAccountData(accountData, accountId)
    } catch (error) {
      logger.error(`Storage set error for ${accountId}.${domain}:`, error)
      throw error
    }
  }

  /**
   * 监听指定账号的数据变化（重构版）
   *
   * 设计原则：
   * - 显式传入 accountId，监听特定账号
   * - 监听聚合键 `account_{id}_info` 的变化
   * - 通过字段比较触发对应回调
   *
   * @param accountId 账号ID（必须显式传入）
   * @param watchConfig 监听配置（domain → callback）
   *
   * @example
   * ```typescript
   * manager.watch(accountId, {
   *   [StorageDomain.USER_INFO]: (change) => {
   *     console.log("User info changed:", change)
   *   }
   * })
   * ```
   */
  watch(
    accountId: string,
    watchConfig: Record<
      string,
      (change?: { newValue?: unknown; oldValue?: unknown }) => void
    >
  ): void {
    const aggregateKey = `account_${accountId}_info`

    logger.info(
      `🔧 [watch] Setting up watch for account ${accountId}, key: ${aggregateKey}`
    )

    this._storage.watch({
      [aggregateKey]: (change) => {
        const oldData = change?.oldValue as AccountData | undefined
        const newData = change?.newValue as AccountData | undefined

        logger.debug(`📝 [watch] Aggregate key changed: ${aggregateKey}`, {
          hasNew: !!newData,
          hasOld: !!oldData
        })

        // 对于每个监听的 domain，检查对应字段是否变化
        Object.entries(watchConfig).forEach(([domain, callback]) => {
          try {
            const field = this.domainToField(domain)
            const oldValue = oldData?.[field]
            const newValue = newData?.[field]

            // 检查字段是否实际变化（使用引用比较）
            if (oldValue !== newValue) {
              logger.debug(
                `🔔 [watch] Field changed, triggering callback: ${domain}`,
                {
                  hasNewValue: newValue !== null && newValue !== undefined,
                  hasOldValue: oldValue !== null && oldValue !== undefined
                }
              )

              callback({ newValue, oldValue })
            }
          } catch (error) {
            logger.error(
              `[watch] Error processing change for domain ${domain}:`,
              error
            )
          }
        })
      }
    })

    logger.info(
      `✅ [watch] Registered ${Object.keys(watchConfig).length} domain watchers for account ${accountId}`
    )
  }

  /**
   * 创建空的账号数据对象（私有方法）
   */
  private createEmptyAccountData(): AccountData {
    return {
      auth: null,
      isValid: false,
      notificationStates: {},
      peerSpending: null,
      purchaseConfig: null,
      subscriptionInfo: null,
      systemPreference: null,
      userInfo: null
    }
  }

  /**
   * 将域名转换为 AccountData 字段名（私有方法）
   */
  private domainToField(domain: string): keyof AccountData {
    const field = DOMAIN_TO_FIELD_MAP[domain]
    if (!field) {
      throw new Error(`Unknown domain: ${domain}`)
    }
    return field
  }

  /**
   * 获取账号聚合数据（私有方法）
   *
   * @param accountId 账号ID（必须传入）
   * @returns 账号完整数据
   */
  private async getAccountData(accountId: string): Promise<AccountData | null> {
    const key = `account_${accountId}_info`
    const data = await this._storage.get<AccountData>(key)

    if (data) {
      logger.debug(`Loaded account data: ${key}`)
    }

    return data
  }

  /**
   * 保存账号聚合数据（私有方法）
   *
   * @param accountData 账号完整数据
   * @param accountId 账号ID（必须传入）
   */
  private async setAccountData(
    accountData: AccountData,
    accountId: string
  ): Promise<void> {
    const key = `account_${accountId}_info`
    await this._storage.set(key, accountData)
    logger.debug(`Saved account data: ${key}`)
  }

  /**
   * 类型安全的字段设置器（私有方法）
   */
  private setAccountDataField<K extends keyof AccountData>(
    accountData: AccountData,
    field: K,
    value: AccountData[K]
  ): void {
    Object.assign(accountData, { [field]: value })
  }
}
