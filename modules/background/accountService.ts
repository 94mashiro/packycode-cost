/**
 * Background 账号管理集成模块
 *
 * 功能：
 * 1. Token 自动检测和账号创建
 * 2. 启动时数据迁移
 * 3. 账号切换时的 WebRequest 监听器更新
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "后台服务要简单可靠，避免复杂状态"
 * ⚛️ Dan: "清晰的错误处理和日志记录"
 * ☕ Bloch: "防御性编程，处理所有边界情况"
 * 🏛️ Fowler: "服务层封装业务逻辑"
 *
 * @since v3.0.0
 */

import { Storage } from "@plasmohq/storage"

import type { AddAccountConfig, AuthStorage } from "~/types"

import { AccountManager, DataMigrationManager } from "~/lib/account"
import { loggers } from "~/lib/logger"
import { getMultiAccountStorageManager } from "~/lib/storage"
import { AccountVersion, TokenType } from "~/types"

const logger = loggers.background

/**
 * Background 账号服务
 *
 * 封装 Background 脚本中的账号管理逻辑
 */
export class BackgroundAccountService {
  private accountManager: AccountManager
  private hasInitialized = false
  private migrationManager: DataMigrationManager

  constructor() {
    const storageManager = getMultiAccountStorageManager()
    const storage = new Storage()

    this.accountManager = new AccountManager(storageManager)
    this.migrationManager = new DataMigrationManager(
      this.accountManager,
      storage
    )

    logger.info("BackgroundAccountService initialized")
  }

  /**
   * 获取 AccountManager 实例（高级用法）
   *
   * ⚠️ 直接使用 AccountManager 需要了解其 API
   */
  getAccountManager(): AccountManager {
    return this.accountManager
  }

  /**
   * 获取当前激活账号信息
   *
   * @param accountType 账号类型
   * @returns 当前账号的认证信息，如果没有则返回 null
   */
  async getCurrentAccountAuth(
    accountType: AccountVersion
  ): Promise<AuthStorage | null> {
    try {
      const account = await this.accountManager.getCurrentAccount(accountType)

      if (!account) {
        return null
      }

      return {
        expiry: account.tokenExpiry,
        token: account.token,
        type: account.tokenType
      }
    } catch (error) {
      logger.error("❌ Failed to get current account auth:", error)
      return null
    }
  }

  /**
   * 处理 API Key 检测（从 WebRequest 拦截）
   *
   * @param apiKey API Key
   * @param accountType 账号类型
   * @returns 账号ID
   */
  async handleAPIKeyDetection(
    apiKey: string,
    accountType: AccountVersion
  ): Promise<string> {
    try {
      logger.info(`🔑 Detecting API Key for: ${accountType}`)

      // 1. 检测是否为新账号
      const detection = await this.accountManager.detectNewAccount(apiKey)

      if (detection.isNew) {
        // 新账号 - 创建
        logger.info(`✨ Creating new account for: ${accountType}`)

        const config: AddAccountConfig = {
          token: apiKey,
          tokenType: "api_key" as TokenType,
          type: accountType
        }

        const accountId = await this.accountManager.addAccount(config)
        logger.info(`✅ New API Key account created: ${accountId}`)

        return accountId
      } else {
        // 已存在账号 - 切换激活
        logger.info(
          `🔄 Existing API Key account detected: ${detection.accountId}, switching...`
        )

        if (detection.accountId) {
          await this.accountManager.switchAccount(detection.accountId)
          logger.info(`✅ Switched to account: ${detection.accountId}`)
          return detection.accountId
        }

        throw new Error("Account detection returned invalid state")
      }
    } catch (error) {
      logger.error("❌ Failed to handle API Key detection:", error)
      throw error
    }
  }

  /**
   * 处理 JWT Token 检测（从 Cookie 获取）
   *
   * @param token JWT Token
   * @param accountType 账号类型
   * @returns 账号ID
   */
  async handleJWTTokenDetection(
    token: string,
    accountType: AccountVersion
  ): Promise<string> {
    try {
      logger.info(`🔍 Detecting JWT token for: ${accountType}`)

      // 1. 检测是否为新账号
      const detection = await this.accountManager.detectNewAccount(token)

      if (detection.isNew) {
        // 新账号 - 创建
        logger.info(`✨ Creating new account for: ${accountType}`)

        const config: AddAccountConfig = {
          token,
          tokenType: "jwt" as TokenType,
          type: accountType
        }

        const accountId = await this.accountManager.addAccount(config)
        logger.info(`✅ New account created: ${accountId}`)

        return accountId
      } else {
        // 已存在账号 - 切换激活
        logger.info(
          `🔄 Existing account detected: ${detection.accountId}, switching...`
        )

        if (detection.accountId) {
          await this.accountManager.switchAccount(detection.accountId)
          logger.info(`✅ Switched to account: ${detection.accountId}`)
          return detection.accountId
        }

        throw new Error("Account detection returned invalid state")
      }
    } catch (error) {
      logger.error("❌ Failed to handle JWT token detection:", error)
      throw error
    }
  }

  /**
   * 初始化 - 执行数据迁移和恢复上次激活账号
   *
   * 应在扩展启动时调用
   */
  async initialize(): Promise<void> {
    if (this.hasInitialized) {
      logger.debug("BackgroundAccountService already initialized")
      return
    }

    try {
      logger.info("🚀 Initializing BackgroundAccountService...")

      // 1. 检查并执行数据迁移
      const needsMigration = await this.migrationManager.needsMigration()
      if (needsMigration) {
        logger.info("📦 Detected v2.x data, starting migration...")
        const migratedCount = await this.migrationManager.migrate()
        logger.info(
          `✅ Migration completed: ${migratedCount} accounts migrated`
        )

        // 输出详细迁移报告
        const report = await this.migrationManager.getMigrationReport()
        logger.info("📊 Final Migration Report:")
        logger.info(`  - Registry version: ${report.accountRegistry?.version}`)
        logger.info(`  - Total accounts: ${report.accounts.length}`)
        logger.info(
          `  - Migration timestamp: ${report.migrationStatus?.timestamp}`
        )
      }

      // 2. 恢复最后使用的账号（如果有）
      // TODO: 从 USER_PREFERENCE 读取上次的账号类型，然后恢复对应的激活账号

      this.hasInitialized = true
      logger.info("✅ BackgroundAccountService initialized")
    } catch (error) {
      logger.error("❌ Failed to initialize BackgroundAccountService:", error)
      throw error
    }
  }
}

// 导出全局单例
let globalBackgroundAccountService: BackgroundAccountService | null = null

/**
 * 获取 Background 账号服务单例
 */
export function getBackgroundAccountService(): BackgroundAccountService {
  if (!globalBackgroundAccountService) {
    globalBackgroundAccountService = new BackgroundAccountService()
  }
  return globalBackgroundAccountService
}
