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

import type { AccountData, AccountRegistry } from "~/types"

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
  private currentAccountId: null | string = null // @deprecated v3.6.0+ 不再使用，保留用于向后兼容
  private initPromise: Promise<void> // 初始化 Promise，确保账号恢复完成

  // v3.6.0+ 激活账号ID缓存（Single Source of Truth 优化）
  private activeAccountIdCache: null | string = null
  private activeAccountIdCacheTime: number = 0
  private readonly activeAccountIdCacheTTL = 100 // 100ms 短期缓存

  constructor(storage: Storage) {
    this._storage = storage
    logger.info("MultiAccountStorageManager created")

    // 自动恢复上次激活的账号
    this.initPromise = this.restoreCurrentAccount()
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
   *
   * v3.1.0+ 优化：从聚合对象中提取字段
   * v3.6.0+ 架构改进：从 registry 实时读取 activeAccountId（Single Source of Truth）
   *
   * @param domain 存储域
   * @returns 数据或 null
   * @throws 如果没有激活账号
   *
   * @example
   * ```typescript
   * const auth = await manager.get(StorageDomain.AUTH)
   * // 实际访问: account_{uuid}_info.auth
   * ```
   */
  async get<T>(domain: string): Promise<null | T> {
    // 等待初始化完成（v3.6.0+: 仍需要等待，确保 registry 已加载）
    await this.initPromise

    // v3.6.0+ 改进：从 registry 实时读取 activeAccountId
    const activeAccountId = await this.getActiveAccountId()

    if (!activeAccountId) {
      throw new Error("No active account. Please add an account first.")
    }

    try {
      // 读取完整账号数据（使用从 registry 获取的 activeAccountId）
      const accountData = await this.getAccountData(activeAccountId)

      if (!accountData) {
        logger.debug(`No account data found for: ${activeAccountId}`)
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
   * @deprecated v3.6.0+ 此方法返回内存缓存的 currentAccountId，不再是 Single Source of Truth
   * @returns 当前账号ID，如果未设置则返回 null
   *
   * 建议：内部使用 getActiveAccountId() 私有方法从 registry 读取最新值
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
   * v3.6.0+ 架构改进：从 registry 实时读取 activeAccountId（Single Source of Truth）
   *
   * @param domain 存储域
   * @throws 如果没有激活账号
   */
  async remove(domain: string): Promise<void> {
    // 等待初始化完成
    await this.initPromise

    // v3.6.0+ 改进：从 registry 实时读取 activeAccountId
    const activeAccountId = await this.getActiveAccountId()

    if (!activeAccountId) {
      throw new Error("No active account. Please add an account first.")
    }

    try {
      // 读取完整账号数据
      const accountData = await this.getAccountData(activeAccountId)

      if (!accountData) {
        logger.debug(`No account data to remove for: ${activeAccountId}`)
        return
      }

      // 设置字段为 null
      const field = this.domainToField(domain)
      this.setAccountDataField(accountData, field, null)

      // 写回
      await this.setAccountData(accountData, activeAccountId)
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
   * v3.5.1+ 修复：统一参数顺序为 (domain, value, override)
   * v3.6.0+ 架构改进：从 registry 实时读取 activeAccountId（Single Source of Truth）
   *
   * @param domain 存储域
   * @param value 数据值
   * @param override 是否覆盖（默认深度合并）
   * @throws 如果没有激活账号
   */
  async set<T>(domain: string, value: T, override = false): Promise<void> {
    // 等待初始化完成
    await this.initPromise

    // v3.6.0+ 改进：从 registry 实时读取 activeAccountId
    const activeAccountId = await this.getActiveAccountId()

    if (!activeAccountId) {
      throw new Error("No active account. Please add an account first.")
    }

    try {
      // 1. 读取完整账号数据（Read）
      let accountData = await this.getAccountData(activeAccountId)

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
      await this.setAccountData(accountData, activeAccountId)
    } catch (error) {
      logger.error(`Storage set error for domain ${domain}:`, error)
      throw error
    }
  }

  /**
   * 设置当前激活账号
   *
   * v3.6.0+ 架构变更：
   * - 此方法主要用于向后兼容，仍会更新内存中的 currentAccountId
   * - 但 get/set/remove 方法已改为从 registry 实时读取 activeAccountId
   * - 实际的账号激活由 AccountManager.switchAccount() 通过更新 registry 管理
   *
   * @param accountId 账号ID
   * @deprecated v3.6.0+ 推荐通过 AccountManager.switchAccount() 切换账号
   *
   * @example
   * ```typescript
   * // 旧方式（仍然有效但不推荐）
   * await manager.setCurrentAccount("uuid-1234")
   *
   * // 新方式（推荐）
   * const accountManager = new AccountManager(storageManager)
   * await accountManager.switchAccount("uuid-1234")
   * ```
   */
  async setCurrentAccount(accountId: string): Promise<void> {
    if (!AccountStorageKeyGenerator.isValidAccountId(accountId)) {
      throw new Error(`Invalid account ID: ${accountId}`)
    }

    // v3.6.0+: 仍然更新内存状态，用于向后兼容
    // 但 get/set/remove 方法会从 registry 读取最新值
    this.currentAccountId = accountId

    // 清空 activeAccountId 缓存，强制下次从 registry 读取
    this.activeAccountIdCache = null

    logger.info(`📌 Current account set to: ${accountId} (backward compatibility)`)
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
   * 聚合键感知的数据监听（v3.6.1+ 修复）
   *
   * 核心修复：
   * - 监听聚合键 `account_{id}_info` 而不是分散键
   * - 通过比较字段变化触发对应回调
   * - 支持账号切换时自动重新设置监听器
   *
   * Bug 说明：
   * v3.1.0 改为聚合存储后，watch 仍监听旧的分散键，导致监听器永远不触发。
   * 这是 popup UI 无法响应 storage 更新的根本原因。
   *
   * @param watchConfig 监听配置（domain → callback）
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
    let currentWatchedAccountId: null | string = null

    // 设置监听器的函数（异步）
    const setupWatchers = async () => {
      // 等待初始化完成
      await this.initPromise

      // v3.6.1+: 从 registry 读取激活账号（Single Source of Truth）
      const activeAccountId = await this.getActiveAccountId()

      if (!activeAccountId) {
        logger.warn("Cannot setup watchers: no active account")
        return
      }

      // 记录当前监听的账号
      currentWatchedAccountId = activeAccountId

      // v3.6.1+ 修复：监听聚合键 `account_{id}_info`
      const aggregateKey = `account_${activeAccountId}_info`

      logger.info(
        `🔧 [watch] Setting up watch for aggregate key: ${aggregateKey}`
      )

      // 监听聚合键的变化
      this._storage.watch({
        [aggregateKey]: (change) => {
          const oldData = change?.oldValue as AccountData | undefined
          const newData = change?.newValue as AccountData | undefined

          logger.debug(
            `📝 [watch] Aggregate key changed: ${aggregateKey}`,
            {
              hasOld: !!oldData,
              hasNew: !!newData
            }
          )

          // 对于每个监听的 domain，检查对应字段是否变化
          Object.entries(originalConfig).forEach(([domain, callback]) => {
            try {
              const field = this.domainToField(domain)
              const oldValue = oldData?.[field]
              const newValue = newData?.[field]

              // 检查字段是否实际变化（深度比较会太昂贵，使用引用比较）
              if (oldValue !== newValue) {
                logger.debug(
                  `🔔 [watch] Field changed, triggering callback: ${domain}`,
                  {
                    hasOldValue: oldValue !== null && oldValue !== undefined,
                    hasNewValue: newValue !== null && newValue !== undefined
                  }
                )

                // 触发回调
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
        `✅ [watch] Registered ${Object.keys(watchConfig).length} domain watchers on ${aggregateKey}`
      )
    }

    // 监听账号切换（v3.6.1+ 新增）
    // 当激活账号变化时，重新设置监听器到新账号的聚合键
    const setupAccountSwitchWatch = async () => {
      await this.initPromise

      this._storage.watch({
        [StorageDomain.ACCOUNT_REGISTRY]: async (change) => {
          const oldRegistry = change?.oldValue as AccountRegistry | undefined
          const newRegistry = change?.newValue as AccountRegistry | undefined

          const oldActiveId = oldRegistry?.activeAccountId
          const newActiveId = newRegistry?.activeAccountId

          // 账号切换检测
          if (oldActiveId !== newActiveId && newActiveId) {
            logger.info(
              `🔄 [watch] Active account changed: ${oldActiveId} → ${newActiveId}`
            )

            // 如果监听的账号发生了变化，重新设置监听器
            if (currentWatchedAccountId !== newActiveId) {
              logger.info(
                `🔄 [watch] Re-setting up watchers for new account: ${newActiveId}`
              )
              await setupWatchers()
            }
          }
        }
      })

      logger.info("✅ [watch] Account switch watcher registered")
    }

    // 启动异步设置
    setupWatchers()
    setupAccountSwitchWatch()

    logger.debug(
      `[watch] Initiated watch setup for ${Object.keys(watchConfig).length} domains`
    )
  }

  /**
   * 获取当前激活账号ID（v3.6.0+ Single Source of Truth）
   *
   * 设计原则：
   * - 从 registry.activeAccountId 读取，而不是使用 this.currentAccountId
   * - 确保跨实例一致性（不同 popup/context 读取同一数据源）
   * - 添加短期缓存（100ms）优化性能，避免同一调用栈中的重复读取
   *
   * @returns 当前激活账号ID，如果没有则返回 null
   * @private
   */
  private async getActiveAccountId(): Promise<null | string> {
    // 检查短期缓存（避免同一调用栈中的重复读取）
    const now = Date.now()
    if (
      this.activeAccountIdCache &&
      now - this.activeAccountIdCacheTime < this.activeAccountIdCacheTTL
    ) {
      logger.debug(`Active account ID cache hit: ${this.activeAccountIdCache}`)
      return this.activeAccountIdCache
    }

    // 从 registry 读取最新值（Single Source of Truth）
    logger.debug("Active account ID cache miss, reading from registry")
    const registry = await this._storage.get<AccountRegistry>(
      StorageDomain.ACCOUNT_REGISTRY
    )

    const activeAccountId = registry?.activeAccountId ?? null

    // 更新缓存
    this.activeAccountIdCache = activeAccountId
    this.activeAccountIdCacheTime = now

    logger.debug(`Active account ID from registry: ${activeAccountId}`)
    return activeAccountId
  }

  /**
   * 创建空的账号数据对象（v3.1.0+ 私有方法）
   */
  private createEmptyAccountData(): AccountData {
    return {
      auth: null,
      isValid: false, // 初始状态为 false，等待服务器验证
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
   * 从存储中恢复上次激活的账号
   *
   * 在构造时自动调用，确保 currentAccountId 始终有效。
   * 这避免了 popup 和 background 初始化竞态条件的问题。
   *
   * 恢复策略：
   * 1. 优先使用 ACCOUNT_REGISTRY.activeAccountId
   * 2. 如果没有 activeAccountId，激活第一个账号
   * 3. 如果没有任何账号，保持 currentAccountId 为 null
   *
   * @private
   */
  private async restoreCurrentAccount(): Promise<void> {
    try {
      const registry = await this._storage.get<{
        accounts: Array<{ id: string; isActive?: boolean }>
        activeAccountId?: string
      }>(StorageDomain.ACCOUNT_REGISTRY)

      if (registry?.activeAccountId) {
        this.currentAccountId = registry.activeAccountId
        logger.info(
          `✅ Auto-restored current account: ${this.currentAccountId}`
        )
      } else if (registry?.accounts && registry.accounts.length > 0) {
        // 如果没有 activeAccountId，但有账号列表，激活第一个
        this.currentAccountId = registry.accounts[0].id
        logger.info(`✅ Auto-activated first account: ${this.currentAccountId}`)
      } else {
        logger.warn("⚠️ No accounts found in registry")
      }
    } catch (error) {
      logger.error("❌ Failed to restore current account:", error)
    }
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
