/**
 * 多账号存储管理器
 *
 * 核心职责：基于账号ID管理数据隔离
 * 让业务方能够无感知地操作正确账号的数据
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "抹平账号差异，统一存储接口"
 * ⚛️ Dan: "提供清晰的错误边界和状态管理"
 * ☕ Bloch: "设计易用的 API，隐藏存储复杂性"
 * 🏛️ Fowler: "应用 Repository 模式管理数据访问"
 *
 * @since v3.0.0
 */

import { Storage } from "@plasmohq/storage"
import { merge } from "lodash"

import type { AccountData } from "~/types"

import { loggers } from "~/lib/logger"

import { AccountStorageKeyGenerator } from "./AccountStorageKeyGenerator"
import { DOMAIN_TO_FIELD_MAP, StorageDomain } from "./domains"

const logger = loggers.storage

/**
 * 多账号存储管理器
 *
 * 核心变化（相比单账号版本）:
 * 1. 不再基于 AccountVersion 生成键，改为基于 accountId
 * 2. 支持跨账号数据访问（用于账号列表管理）
 * 3. 保留深度合并和 watch 能力
 */
export class MultiAccountStorageManager {
  private _storage: Storage
  private accountDataCache: Map<string, AccountData> = new Map() // v3.1.0+ 缓存层
  private currentAccountId: null | string = null

  constructor(storage: Storage) {
    this._storage = storage
    logger.info("MultiAccountStorageManager created")
  }

  /**
   * 清空指定账号的所有数据
   *
   * v3.1.0+ 优化：删除聚合键
   *
   * 用途：账号删除、数据清理
   *
   * 策略：删除账号的聚合数据键
   *
   * @param accountId 账号ID
   *
   * @example
   * ```typescript
   * // 删除账号时清空所有数据
   * await manager.clearAccountData("uuid-1234")
   * ```
   */
  async clearAccountData(accountId: string): Promise<void> {
    try {
      // 删除聚合数据键
      const key = `account_${accountId}_info`
      await this._storage.remove(key)

      // 清除缓存
      this.accountDataCache.delete(accountId)

      logger.info(`🗑️ Cleared account data: ${key}`)
    } catch (error) {
      logger.error(`Failed to clear account data for ${accountId}:`, error)
      throw error
    }
  }

  /**
   * 获取当前账号的数据
   * 自动使用 currentAccountId 生成存储键
   *
   * v3.1.0+ 优化：从聚合对象中提取字段
   *
   * @param domain 存储域
   * @returns 数据或 null
   * @throws 如果未设置当前账号
   *
   * @example
   * ```typescript
   * const auth = await manager.get(StorageDomain.AUTH)
   * // 实际访问: account_{uuid}_info.auth
   * ```
   */
  async get<T>(domain: string): Promise<null | T> {
    if (!this.currentAccountId) {
      throw new Error("No active account set. Call setCurrentAccount() first.")
    }

    try {
      // 读取完整账号数据
      const accountData = await this.getAccountData()

      if (!accountData) {
        logger.debug(`No account data found for: ${this.currentAccountId}`)
        return null
      }

      // 提取指定域的数据
      const field = this.domainToField(domain)
      const result = accountData[field] as null | T

      logger.debug(`Storage get: ${domain} ->`, result ? "found" : "null")
      return result
    } catch (error) {
      logger.error(`Storage get error for domain ${domain}:`, error)
      return null
    }
  }

  /**
   * 获取所有账号ID列表
   *
   * 策略：从 ACCOUNT_REGISTRY 读取账号列表
   *
   * @returns 账号ID列表
   *
   * @example
   * ```typescript
   * const accountIds = await manager.getAllAccountIds()
   * // => ["uuid-1234", "uuid-5678", ...]
   * ```
   */
  async getAllAccountIds(): Promise<string[]> {
    try {
      // 从账号注册表读取所有账号
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
   * 获取当前激活账号ID
   *
   * @returns 当前账号ID，如果未设置则返回 null
   */
  getCurrentAccountId(): null | string {
    return this.currentAccountId
  }

  /**
   * 获取指定账号的数据（跨账号访问）
   *
   * v3.1.0+ 优化：从聚合对象提取字段
   *
   * 用途：账号列表管理、账号切换预览
   *
   * @param accountId 账号ID
   * @param domain 存储域
   * @returns 数据或 null
   *
   * @example
   * ```typescript
   * // 获取其他账号的用户信息（用于列表显示）
   * const userInfo = await manager.getForAccount("uuid-5678", StorageDomain.USER_INFO)
   * ```
   */
  async getForAccount<T>(accountId: string, domain: string): Promise<null | T> {
    try {
      // 读取指定账号的完整数据
      const accountData = await this.getAccountData(accountId)

      if (!accountData) {
        logger.debug(`No account data found for: ${accountId}`)
        return null
      }

      // 提取指定域的数据
      const field = this.domainToField(domain)
      const result = accountData[field] as null | T

      logger.debug(
        `Storage getForAccount: ${accountId}.${domain} ->`,
        result ? "found" : "null"
      )
      return result
    } catch (error) {
      logger.error(
        `Storage getForAccount error for ${accountId}.${domain}:`,
        error
      )
      return null
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
   * 删除当前账号的数据
   *
   * v3.1.0+ 优化：设置字段为 null（保留数据结构）
   *
   * @param domain 存储域
   * @throws 如果未设置当前账号
   */
  async remove(domain: string): Promise<void> {
    if (!this.currentAccountId) {
      throw new Error("No active account set. Call setCurrentAccount() first.")
    }

    try {
      // 读取完整账号数据
      const accountData = await this.getAccountData()

      if (!accountData) {
        logger.debug(`No account data to remove for: ${this.currentAccountId}`)
        return
      }

      // 设置字段为 null
      const field = this.domainToField(domain)
      this.setAccountDataField(accountData, field, null)

      // 写回
      await this.setAccountData(accountData)
      logger.debug(`Storage remove: ${domain}`)
    } catch (error) {
      logger.error(`Storage remove error for domain ${domain}:`, error)
      throw error
    }
  }

  /**
   * 设置当前账号的数据
   *
   * v3.1.0+ 优化：RMW 模式更新聚合对象
   *
   * @param domain 存储域
   * @param value 数据值
   * @param override 是否覆盖（默认深度合并）
   * @throws 如果未设置当前账号
   */
  async set<T>(domain: string, override = false, value: T): Promise<void> {
    if (!this.currentAccountId) {
      throw new Error("No active account set. Call setCurrentAccount() first.")
    }

    try {
      // 1. 读取完整账号数据（Read）
      let accountData = await this.getAccountData()

      if (!accountData) {
        accountData = this.createEmptyAccountData()
        logger.debug("Created new account data object")
      }

      const field = this.domainToField(domain)

      // 2. 修改指定字段（Modify）
      if (override) {
        // 强制覆盖模式
        this.setAccountDataField(
          accountData,
          field,
          value as AccountData[typeof field]
        )
        logger.debug(`Storage set (override): ${domain}`)
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
        logger.debug(`Storage set (direct): ${domain}`)
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
          logger.debug(`Storage set (deep merged): ${domain}`)
        } else {
          this.setAccountDataField(
            accountData,
            field,
            value as AccountData[typeof field]
          )
          logger.debug(`Storage set (initial): ${domain}`)
        }
      }

      // 3. 写回完整数据（Write）
      await this.setAccountData(accountData)
    } catch (error) {
      logger.error(`Storage set error for domain ${domain}:`, error)
      throw error
    }
  }

  /**
   * 设置当前激活账号
   * 所有后续的 get/set 操作都基于此账号
   *
   * @param accountId 账号ID
   *
   * @example
   * ```typescript
   * const manager = new MultiAccountStorageManager(storage)
   * await manager.setCurrentAccount("uuid-1234")
   * // 之后的所有操作都针对这个账号
   * const auth = await manager.get(StorageDomain.AUTH)
   * ```
   */
  async setCurrentAccount(accountId: string): Promise<void> {
    if (!AccountStorageKeyGenerator.isValidAccountId(accountId)) {
      throw new Error(`Invalid account ID: ${accountId}`)
    }

    this.currentAccountId = accountId
    logger.info(`📌 Current account set to: ${accountId}`)
  }

  /**
   * 设置指定账号的数据（跨账号访问）
   *
   * v3.1.0+ 优化：RMW 模式更新聚合对象
   *
   * @param accountId 账号ID
   * @param domain 存储域
   * @param value 数据值
   */
  async setForAccount<T>(
    accountId: string,
    domain: string,
    value: T
  ): Promise<void> {
    try {
      // 读取指定账号的完整数据
      let accountData = await this.getAccountData(accountId)

      if (!accountData) {
        accountData = this.createEmptyAccountData()
        logger.debug(`Created new account data for: ${accountId}`)
      }

      // 更新字段
      const field = this.domainToField(domain)
      this.setAccountDataField(
        accountData,
        field,
        value as AccountData[typeof field]
      )

      // 写回
      await this.setAccountData(accountData, accountId)
      logger.debug(`Storage setForAccount: ${accountId}.${domain}`)
    } catch (error) {
      logger.error(
        `Storage setForAccount error for ${accountId}.${domain}:`,
        error
      )
      throw error
    }
  }

  /**
   * 版本感知的数据监听
   *
   * 自动处理账号切换时的监听器更新
   *
   * @param watchConfig 监听配置
   *
   * @example
   * ```typescript
   * manager.watch({
   *   [StorageDomain.USER_INFO]: (change) => {
   *     console.log("User info changed:", change)
   *   }
   * })
   * ```
   */
  watch(
    watchConfig: Record<
      string,
      (change?: { newValue?: unknown; oldValue?: unknown }) => void
    >
  ): void {
    // 存储原始的监听配置
    const originalConfig = { ...watchConfig }

    // 设置监听器的函数
    const setupWatchers = () => {
      if (!this.currentAccountId) {
        logger.warn("Cannot setup watchers: no active account")
        return
      }

      const accountWatchConfig: Record<
        string,
        (change?: { newValue?: unknown; oldValue?: unknown }) => void
      > = {}

      Object.entries(originalConfig).forEach(([domain, callback]) => {
        // 安全检查：确保有当前账号
        if (!this.currentAccountId) {
          logger.warn("No current account, skipping watch setup for:", domain)
          return
        }

        const key = AccountStorageKeyGenerator.generateKey(
          this.currentAccountId,
          domain
        )
        accountWatchConfig[key] = callback
        logger.debug(`Setup watch: ${domain} -> ${key}`)
      })

      this._storage.watch(accountWatchConfig)
    }

    // 初始设置
    setupWatchers()

    logger.debug(
      `Registered ${Object.keys(watchConfig).length} watch listeners for account: ${this.currentAccountId}`
    )
  }

  /**
   * 创建空的账号数据对象（v3.1.0+ 私有方法）
   */
  private createEmptyAccountData(): AccountData {
    return {
      auth: null,
      notificationStates: {},
      peerSpending: null,
      purchaseConfig: null,
      subscriptionInfo: null,
      systemPreference: null,
      userInfo: null
    }
  }

  /**
   * 将域名转换为 AccountData 字段名（v3.1.0+ 私有方法）
   */
  private domainToField(domain: string): keyof AccountData {
    const field = DOMAIN_TO_FIELD_MAP[domain]
    if (!field) {
      throw new Error(`Unknown domain: ${domain}`)
    }
    return field
  }

  /**
   * 获取账号聚合数据（v3.1.0+ 私有方法）
   *
   * @param accountId 账号ID（可选，默认使用当前账号）
   * @returns 账号完整数据
   */
  private async getAccountData(
    accountId?: string
  ): Promise<AccountData | null> {
    const id = accountId || this.currentAccountId

    if (!id) {
      throw new Error("No active account set")
    }

    // 尝试从缓存读取
    const cached = this.accountDataCache.get(id)
    if (cached) {
      logger.debug(`Cache hit for account: ${id}`)
      return cached
    }

    // 从存储读取
    const key = `account_${id}_info`
    const data = await this._storage.get<AccountData>(key)

    if (data) {
      // 更新缓存
      this.accountDataCache.set(id, data)
      logger.debug(`Loaded account data: ${key}`)
    }

    return data
  }

  /**
   * 保存账号聚合数据（v3.1.0+ 私有方法）
   *
   * @param accountData 账号完整数据
   * @param accountId 账号ID（可选，默认使用当前账号）
   */
  private async setAccountData(
    accountData: AccountData,
    accountId?: string
  ): Promise<void> {
    const id = accountId || this.currentAccountId

    if (!id) {
      throw new Error("No active account set")
    }

    const key = `account_${id}_info`
    await this._storage.set(key, accountData)

    // 更新缓存
    this.accountDataCache.set(id, accountData)
    logger.debug(`Saved account data: ${key}`)
  }

  /**
   * 类型安全的字段设置器（v3.1.0+ 私有方法）
   *
   * 使用泛型约束确保类型安全，避免 as any
   *
   * @param accountData 账号数据对象
   * @param field 字段名
   * @param value 字段值
   */
  private setAccountDataField<K extends keyof AccountData>(
    accountData: AccountData,
    field: K,
    value: AccountData[K]
  ): void {
    // 使用 Object.assign 避免 TypeScript 动态索引类型问题
    // 这是类型安全的，因为泛型约束确保了 value 的类型匹配
    Object.assign(accountData, { [field]: value })
  }
}
