/**
 * AccountManager - 多账号管理核心业务逻辑
 *
 * 核心职责：
 * 1. 账号生命周期管理（添加、删除、更新）
 * 2. 账号切换和激活状态管理
 * 3. Token 验证和去重
 * 4. 与 AccountRegistry 的交互
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "简单直接的业务逻辑，避免过度抽象"
 * ⚛️ Dan: "清晰的错误边界和状态管理"
 * ☕ Bloch: "不可变性优先，防御性编程"
 * 🏛️ Fowler: "领域驱动设计，业务逻辑集中管理"
 *
 * @since v3.0.0
 */

import { v4 as uuidv4 } from "uuid"

import type {
  Account,
  AccountCollection,
  AccountDetectionResult,
  AccountRegistry,
  AccountSnapshot,
  AddAccountConfig
} from "~/types"

import { loggers } from "~/lib/logger"
import { AccountVersion, TokenType } from "~/types"

import { StorageDomain } from "../storage/domains"
import { MultiAccountStorageManager } from "../storage/MultiAccountStorageManager"

const logger = loggers.account

/**
 * 账号管理器
 *
 * 核心业务逻辑层，所有账号操作的入口
 */
export class AccountManager {
  private storageManager: MultiAccountStorageManager

  constructor(storageManager: MultiAccountStorageManager) {
    this.storageManager = storageManager
    logger.info("AccountManager initialized")
  }

  /**
   * 添加新账号
   *
   * 功能：
   * 1. Token 去重检查（基于 hash）
   * 2. 创建账号实体
   * 3. 更新账号注册表
   * 4. 设置为当前激活账号
   *
   * @param config 账号配置
   * @returns 账号ID
   * @throws 如果 token 已存在
   *
   * @example
   * ```typescript
   * const accountId = await manager.addAccount({
   *   token: "sk-ant-...",
   *   tokenType: TokenType.API_KEY,
   *   type: AccountVersion.SHARED,
   *   displayName: "公交车账号"
   * })
   * ```
   */
  async addAccount(config: AddAccountConfig): Promise<string> {
    logger.info(`Adding new account: ${config.type}`)

    // 1. 检测是否为已存在的账号
    const detection = await this.detectNewAccount(config.token)
    if (!detection.isNew && detection.accountId) {
      logger.warn(`Account already exists: ${detection.accountId}`)
      throw new Error(`Account with this token already exists`)
    }

    // 2. 生成账号ID（使用 UUID v4）
    const accountId = this.generateAccountId()

    // 3. 创建账号实体
    const now = Date.now()
    const account: Account = {
      createdAt: now,
      displayName:
        config.displayName || this.getDefaultDisplayName(config.type),
      id: accountId,
      isActive: false, // 稍后会设置为激活
      isValid: true, // 默认有效，后续由验证流程更新
      lastUsedAt: now,
      token: config.token,
      tokenType: config.tokenType,
      type: config.type,
      ...(config.tokenType === "jwt" && {
        tokenExpiry: this.extractTokenExpiry(config.token)
      })
    }

    // 4. 获取当前账号注册表
    const registry = await this.getOrCreateRegistry()

    // 5. 添加到账号列表
    registry.accounts.push(account)

    // 6. 保存注册表
    await this.saveRegistry(registry)

    // 7. 设置为当前激活账号
    await this.switchAccount(accountId)

    logger.info(`✅ Account added successfully: ${accountId}`)
    return accountId
  }

  /**
   * 检测 token 是否对应新账号
   *
   * 策略：遍历所有账号，查找匹配 token 的账号
   *
   * @param token 认证令牌
   * @returns 检测结果
   */
  async detectNewAccount(token: string): Promise<AccountDetectionResult> {
    const registry = await this.getOrCreateRegistry()

    // 遍历所有账号查找匹配 token
    const existingAccount = registry.accounts.find((acc) => acc.token === token)

    if (existingAccount) {
      return {
        accountId: existingAccount.id,
        isNew: false
      }
    }

    return {
      isNew: true
    }
  }

  /**
   * 生成账号ID
   *
   * 策略：使用 UUID v4 生成唯一标识
   * 好处：标准化、唯一性保证、无需依赖 token
   *
   * @returns 账号ID（UUID v4 格式）
   */
  generateAccountId(): string {
    return uuidv4()
  }

  /**
   * 获取所有账号列表
   *
   * @returns 账号列表（按最后使用时间倒序）
   */
  async getAllAccounts(): Promise<Account[]> {
    const registry = await this.getOrCreateRegistry()
    // 按最后使用时间倒序排列
    return [...registry.accounts].sort((a, b) => b.lastUsedAt - a.lastUsedAt)
  }

  /**
   * 获取当前激活账号
   *
   * @param type 账号类型
   * @returns 当前激活账号，如果没有则返回 null
   */
  async getCurrentAccount(type: AccountVersion): Promise<Account | null> {
    const registry = await this.getOrCreateRegistry()
    const activeAccountId = registry.activeAccounts[type]

    if (!activeAccountId) {
      return null
    }

    return registry.accounts.find((acc) => acc.id === activeAccountId) || null
  }

  /**
   * 删除账号
   *
   * 功能：
   * 1. 从注册表移除账号
   * 2. 清理账号的所有存储数据
   * 3. 如果是激活账号，自动切换到同类型的其他账号
   *
   * @param accountId 账号ID
   *
   * @example
   * ```typescript
   * await manager.removeAccount("acc_1234567890abcdef")
   * ```
   */
  async removeAccount(accountId: string): Promise<void> {
    logger.info(`Removing account: ${accountId}`)

    const registry = await this.getOrCreateRegistry()

    // 1. 查找账号
    const account = registry.accounts.find((acc) => acc.id === accountId)
    if (!account) {
      throw new Error(`Account not found: ${accountId}`)
    }

    // 2. 从注册表移除
    registry.accounts = registry.accounts.filter((acc) => acc.id !== accountId)

    // 3. 如果是激活账号，切换到同类型的其他账号
    if (registry.activeAccounts[account.type] === accountId) {
      const otherAccount = registry.accounts.find(
        (acc) => acc.type === account.type
      )
      registry.activeAccounts[account.type] = otherAccount
        ? otherAccount.id
        : null
    }

    // 4. 保存注册表
    await this.saveRegistry(registry)

    // 5. 清理账号的所有存储数据
    await this.storageManager.clearAccountData(accountId)

    logger.info(`✅ Account removed successfully: ${accountId}`)
  }

  /**
   * 切换账号
   *
   * 功能：
   * 1. 更新账号注册表中的激活状态
   * 2. 设置存储管理器的当前账号
   * 3. 更新账号的最后使用时间
   *
   * @param accountId 账号ID
   *
   * @example
   * ```typescript
   * await manager.switchAccount("acc_1234567890abcdef")
   * ```
   */
  async switchAccount(accountId: string): Promise<void> {
    logger.info(`Switching to account: ${accountId}`)

    const registry = await this.getOrCreateRegistry()

    // 1. 查找账号
    const account = registry.accounts.find((acc) => acc.id === accountId)
    if (!account) {
      throw new Error(`Account not found: ${accountId}`)
    }

    // 2. 更新激活状态
    const oldActiveId = registry.activeAccounts[account.type]
    if (oldActiveId) {
      const oldAccount = registry.accounts.find((acc) => acc.id === oldActiveId)
      if (oldAccount) {
        oldAccount.isActive = false
      }
    }

    account.isActive = true
    account.lastUsedAt = Date.now()
    registry.activeAccounts[account.type] = accountId

    // 3. 保存注册表
    await this.saveRegistry(registry)

    // 4. 设置存储管理器的当前账号
    await this.storageManager.setCurrentAccount(accountId)

    logger.info(`✅ Switched to account: ${accountId}`)
  }

  /**
   * 更新账号快照数据
   *
   * 用途：缓存账号的关键信息，用于列表显示
   *
   * @param accountId 账号ID
   * @param snapshot 快照数据
   *
   * @example
   * ```typescript
   * await manager.updateAccountSnapshot("acc_123", {
   *   dailySpent: 1.5,
   *   dailyLimit: 10,
   *   monthlySpent: 15,
   *   opusEnabled: true
   * })
   * ```
   */
  async updateAccountSnapshot(
    accountId: string,
    snapshot: AccountSnapshot
  ): Promise<void> {
    const registry = await this.getOrCreateRegistry()

    const account = registry.accounts.find((acc) => acc.id === accountId)
    if (!account) {
      throw new Error(`Account not found: ${accountId}`)
    }

    account.snapshot = snapshot
    account.lastSyncAt = Date.now()

    await this.saveRegistry(registry)
    logger.debug(`Updated snapshot for account: ${accountId}`)
  }

  /**
   * 更新账号有效性状态
   *
   * @param accountId 账号ID
   * @param isValid 是否有效
   */
  async updateAccountValidity(
    accountId: string,
    isValid: boolean
  ): Promise<void> {
    const registry = await this.getOrCreateRegistry()

    const account = registry.accounts.find((acc) => acc.id === accountId)
    if (!account) {
      throw new Error(`Account not found: ${accountId}`)
    }

    account.isValid = isValid
    await this.saveRegistry(registry)

    logger.info(`Updated account validity: ${accountId} -> ${isValid}`)
  }

  /**
   * 提取 JWT Token 过期时间
   */
  private extractTokenExpiry(token: string): number | undefined {
    try {
      // JWT 格式: header.payload.signature
      const parts = token.split(".")
      if (parts.length !== 3) {
        return undefined
      }

      // 解码 payload
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64").toString("utf-8")
      )

      // exp 字段是 Unix 时间戳（秒），转换为毫秒
      return payload.exp ? payload.exp * 1000 : undefined
    } catch (error) {
      logger.error("Failed to extract token expiry:", error)
      return undefined
    }
  }

  /**
   * 获取默认显示名称
   */
  private getDefaultDisplayName(type: AccountVersion): string {
    const names: Record<AccountVersion, string> = {
      [AccountVersion.CODEX_SHARED]: "Codex 账号",
      [AccountVersion.PRIVATE]: "滴滴车账号",
      [AccountVersion.SHARED]: "公交车账号"
    }
    return names[type]
  }

  /**
   * 获取或创建账号注册表
   */
  private async getOrCreateRegistry(): Promise<AccountRegistry> {
    const existing = await this.storageManager
      .getUnderlyingStorage()
      .get<AccountRegistry>(StorageDomain.ACCOUNT_REGISTRY)

    if (existing) {
      return existing
    }

    // 创建默认注册表
    const defaultRegistry: AccountRegistry = {
      accounts: [],
      activeAccounts: {
        [AccountVersion.CODEX_SHARED]: null,
        [AccountVersion.PRIVATE]: null,
        [AccountVersion.SHARED]: null
      } as AccountCollection,
      version: 1
    }

    await this.saveRegistry(defaultRegistry)
    logger.info("Created new account registry")

    return defaultRegistry
  }

  /**
   * 保存账号注册表
   */
  private async saveRegistry(registry: AccountRegistry): Promise<void> {
    await this.storageManager
      .getUnderlyingStorage()
      .set(StorageDomain.ACCOUNT_REGISTRY, registry)
  }
}
