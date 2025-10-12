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
 */

import { v4 as uuidv4 } from "uuid"

import { loggers } from "~/lib/logger"
import {
  type Account,
  type AccountData,
  type AccountDetectionResult,
  type AccountRegistry,
  type AddAccountConfig,
  TokenType,
  type UpdateAccountConfig
} from "~/types"
import { PackySite } from "~/types/account"
import { getSiteAccountName } from "~/utils/siteHelpers"

import { StorageDomain } from "../storage/domains"
import { MultiAccountStorageManager } from "../storage/MultiAccountStorageManager"

const logger = loggers.account

/**
 * 账号管理器
 *
 * 核心业务逻辑层，所有账号操作的入口
 *
 * 架构清理：
 * - 移除注册表缓存，确保数据一致性
 * - Chrome Storage 本身有内存缓存，无需应用层缓存
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
    logger.info(`Adding new account for site: ${config.site}`)

    // 1. 检测是否为已存在的账号
    const detection = await this.detectNewAccount(config.token)
    if (!detection.isNew && detection.accountId) {
      logger.warn(`Account already exists: ${detection.accountId}`)
      throw new Error(`Account with this token already exists`)
    }

    // 2. 生成账号ID（使用 UUID v4）
    const accountId = this.generateAccountId()

    // 3. 创建账号实体（只包含表单字段）
    const now = Date.now()
    const account: Account = {
      createdAt: now,
      displayName:
        config.displayName || this.getDefaultDisplayName(config.site),
      id: accountId,
      isActive: false, // 稍后会设置为激活
      lastUsedAt: now,
      site: config.site,
      token: config.token,
      tokenType: config.tokenType
    }

    // 4. 获取当前账号注册表
    const registry = await this.getOrCreateRegistry()

    // 5. 添加到账号列表
    registry.accounts.push(account)

    // 6. 保存注册表
    await this.saveRegistry(registry)

    // 7. 创建初始 AccountData（包含 API 派生字段）
    const accountData: AccountData = {
      auth: {
        token: config.token,
        type: config.tokenType
      },
      isValid: true, // 默认有效，后续由验证流程更新
      lastSyncAt: undefined,
      notificationStates: {},
      peerSpending: null,
      purchaseConfig: null,
      subscriptionInfo: null,
      systemPreference: null,
      tokenExpiry:
        config.tokenType === TokenType.JWT
          ? this.extractTokenExpiry(config.token)
          : undefined,
      userInfo: null
    }

    // 8. 保存 AccountData（直接使用底层 Storage）
    const storage = this.storageManager.getUnderlyingStorage()
    await storage.set(`account_${accountId}_info`, accountData)

    // 9. 设置为当前激活账号
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
   * @returns 账号列表（按创建时间升序，固定顺序）
   */
  async getAllAccounts(): Promise<Account[]> {
    const registry = await this.getOrCreateRegistry()
    // 按创建时间升序排列（固定顺序，不随切换变化）
    return [...registry.accounts].sort((a, b) => a.createdAt - b.createdAt)
  }

  /**
   * 获取当前激活账号
   *
   * 重构：不再需要类型参数，返回全局唯一的激活账号
   *
   * @returns 当前激活账号，如果没有则返回 null
   */
  async getCurrentAccount(): Promise<Account | null> {
    const registry = await this.getOrCreateRegistry()
    const { activeAccountId } = registry

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

    // 3. 如果删除的是激活账号，清空激活状态（简化逻辑）
    if (registry.activeAccountId === accountId) {
      registry.activeAccountId = null
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
   * 功能（重构）：
   * 1. 更新账号注册表中的激活状态（全局唯一）
   * 2. 设置存储管理器的当前账号
   * 3. 更新账号的最后使用时间
   * 4. 保存账号类型到用户偏好
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

    // 2. 更新激活状态（全局唯一激活账号）
    // 将所有其他账号设为非激活
    registry.accounts.forEach((acc) => {
      if (acc.id !== accountId) {
        acc.isActive = false
      }
    })

    account.isActive = true
    account.lastUsedAt = Date.now()
    registry.activeAccountId = accountId

    // 3. 保存注册表
    await this.saveRegistry(registry)

    // 4. 保存账号站点到用户偏好（移除了 setCurrentAccount 调用 - 无状态架构）
    try {
      await this.saveLastActiveSite(account.site)
    } catch (error) {
      // 保存偏好失败不应影响切换操作
      logger.warn("Failed to save last active site:", error)
    }

    logger.info(`✅ Switched to account: ${accountId}`)
  }

  /**
   * 更新账号信息
   *
   * 功能：
   * 1. 更新账号的表单字段（displayName, site, token, tokenType）
   * 2. 支持部分更新（只更新提供的字段）
   * 3. 更新 token 时自动更新 AccountData 中的认证信息和 JWT expiry
   *
   * 设计原则 (四师协作):
   * 🐧 Linus: "简单的字段更新，不要过度复杂化"
   * ⚛️ Dan: "乐观更新，快速反馈"
   * ☕ Bloch: "防御性编程，验证账号存在性"
   * 🏛️ Fowler: "保持领域模型的一致性"
   *
   * @param accountId 账号ID
   * @param updates 更新配置
   * @throws 如果账号不存在
   *
   * @example
   * ```typescript
   * await manager.updateAccount("acc_123", {
   *   displayName: "我的新账号名称",
   *   site: PackySite.WWW,
   *   token: "new_token_value"
   * })
   * ```
   */
  async updateAccount(
    accountId: string,
    updates: UpdateAccountConfig
  ): Promise<void> {
    logger.info(`Updating account: ${accountId}`, updates)

    const registry = await this.getOrCreateRegistry()

    // 1. 查找账号
    const account = registry.accounts.find((acc) => acc.id === accountId)
    if (!account) {
      throw new Error(`Account not found: ${accountId}`)
    }

    // 2. 应用更新到 Account（只更新表单字段）
    if (updates.displayName !== undefined) {
      account.displayName = updates.displayName
    }

    if (updates.site !== undefined) {
      account.site = updates.site
    }

    if (updates.tokenType !== undefined) {
      account.tokenType = updates.tokenType
    }

    if (updates.token !== undefined) {
      account.token = updates.token
    }

    // 3. 保存注册表
    await this.saveRegistry(registry)

    // 4. 如果更新了 token，需要更新 AccountData
    if (updates.token !== undefined || updates.tokenType !== undefined) {
      const storage = this.storageManager.getUnderlyingStorage()
      const accountData =
        (await storage.get<AccountData>(`account_${accountId}_info`)) ||
        this.createEmptyAccountData()

      // 更新认证信息
      accountData.auth = {
        token: account.token,
        type: account.tokenType
      }

      // 如果是 JWT，提取过期时间；否则移除过期时间
      if (account.tokenType === TokenType.JWT) {
        accountData.tokenExpiry = this.extractTokenExpiry(account.token)
      } else {
        delete accountData.tokenExpiry
      }

      await storage.set(`account_${accountId}_info`, accountData)
    }

    logger.info(`✅ Account updated successfully: ${accountId}`)
  }

  

  /**
   * 更新账号有效性状态
   *
   * 有效性状态存储在 AccountData 中
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

    // 更新 AccountData 中的有效性状态
    const storage = this.storageManager.getUnderlyingStorage()
    const accountData =
      (await storage.get<AccountData>(`account_${accountId}_info`)) ||
      this.createEmptyAccountData()

    accountData.isValid = isValid
    await storage.set(`account_${accountId}_info`, accountData)

    logger.info(`Updated account validity: ${accountId} -> ${isValid}`)
  }

  /**
   * 创建空的 AccountData 对象
   *
   * 用于当 AccountData 不存在时提供默认值
   */
  private createEmptyAccountData(): AccountData {
    return {
      auth: null,
      isValid: false,
      lastSyncAt: undefined,
      notificationStates: {},
      peerSpending: null,
      purchaseConfig: null,
      subscriptionInfo: null,
      systemPreference: null,
      tokenExpiry: undefined,
      userInfo: null
    }
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
   * 获取默认显示名称（基于站点）
   *
   * @version 3.0.0 - 改为基于 PackySite
   */
  private getDefaultDisplayName(site: PackySite): string {
    return getSiteAccountName(site)
  }

  /**
   * 获取或创建账号注册表
   *
   * 架构清理：移除缓存，直接从 Chrome Storage 读取
   * 优化：自动检测并迁移旧格式数据
   *
   * 设计原则：
   * - 🐧 Linus: "数据一致性 > 微优化"
   * - ⚛️ Dan: "单一数据源，清晰的数据流"
   * - ☕ Bloch: "简单直接，易于理解"
   * - 🏛️ Fowler: "避免缓存带来的复杂度"
   */
  private async getOrCreateRegistry(): Promise<AccountRegistry> {
    // 直接从存储读取（Chrome Storage 本身有内存缓存）
    const existing = await this.storageManager
      .getUnderlyingStorage()
      .get<AccountRegistry>(StorageDomain.ACCOUNT_REGISTRY)

    if (existing) {
      // 检测并迁移旧格式数据
      if ("activeAccounts" in existing) {
        logger.info("Detected old registry format, migrating...")
        const migrated = await this.migrateRegistryFormat(existing as any)
        await this.saveRegistry(migrated)
        return migrated
      }

      return existing
    }

    // 不存在则创建默认注册表（新格式）
    const defaultRegistry: AccountRegistry = {
      accounts: [],
      activeAccountId: null,
      version: 1
    }

    await this.saveRegistry(defaultRegistry)
    logger.info("Created new account registry")

    return defaultRegistry
  }

  /**
   * 迁移旧格式的注册表（数据迁移）
   *
   * 将 activeAccounts (按类型索引) 转换为 activeAccountId (全局唯一)
   *
   * 迁移策略：
   * 1. 找到所有 isActive=true 的账号
   * 2. 如果有多个，选择 lastUsedAt 最新的
   * 3. 如果没有，设置为 null
   *
   * @param oldRegistry 旧格式的注册表（包含 activeAccounts 字段）
   * @returns 新格式的注册表（包含 activeAccountId 字段）
   */
  private async migrateRegistryFormat(
    oldRegistry: AccountRegistry & {
      activeAccounts?: Record<string, null | string>
    }
  ): Promise<AccountRegistry> {
    logger.info("🔄 Migrating registry format...")

    // 找到所有激活的账号
    const activeAccounts = oldRegistry.accounts.filter((acc) => acc.isActive)

    // 选择最近使用的账号作为全局激活账号
    let activeAccountId: null | string = null

    if (activeAccounts.length > 0) {
      // 按 lastUsedAt 降序排序，取第一个
      const [mostRecentAccount] = activeAccounts.sort(
        (a, b) => b.lastUsedAt - a.lastUsedAt
      )
      activeAccountId = mostRecentAccount.id

      logger.info(
        `Selected account ${activeAccountId} as global active account`
      )

      // 将其他激活账号设为非激活
      oldRegistry.accounts.forEach((acc) => {
        if (acc.id !== activeAccountId) {
          acc.isActive = false
        }
      })
    }

    // 构建新格式的注册表
    const newRegistry: AccountRegistry = {
      accounts: oldRegistry.accounts,
      activeAccountId,
      version: oldRegistry.version
    }

    logger.info("✅ Registry format migration completed")

    return newRegistry
  }

  /**
   * 保存上次激活的站点到用户偏好
   *
   * 用于在下次启动时恢复用户的账号选择
   *
   * @version 3.0.0 - 改为保存站点而非账号类型
   */
  private async saveLastActiveSite(site: PackySite): Promise<void> {
    const storage = this.storageManager.getUnderlyingStorage()

    // 读取当前用户偏好
    const currentPreference = await storage.get(StorageDomain.USER_PREFERENCE)

    // 更新站点信息（安全类型断言）
    const preference =
      typeof currentPreference === "object" && currentPreference !== null
        ? (currentPreference as Record<string, unknown>)
        : {}

    await storage.set(StorageDomain.USER_PREFERENCE, {
      ...preference,
      last_active_site: site
    })

    logger.debug(`Saved last active site: ${site}`)
  }

  /**
   * 保存账号注册表
   *
   * 架构清理：移除缓存，直接写入 Chrome Storage
   */
  private async saveRegistry(registry: AccountRegistry): Promise<void> {
    await this.storageManager
      .getUnderlyingStorage()
      .set(StorageDomain.ACCOUNT_REGISTRY, registry)

    logger.debug("Registry saved")
  }
}
