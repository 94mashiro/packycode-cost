/**
 * DataMigrationManager - v2.x → v3.x 数据迁移管理
 *
 * @deprecated v3.5.0+ 此类仅用于历史数据迁移
 * @internal 业务逻辑不应使用此类
 *
 * 核心职责：
 * 1. 检测是否需要迁移
 * 2. 将 v2.x 版本感知存储迁移到多账号架构
 * 3. 保留旧数据作为备份
 * 4. 幂等性保证（可重复执行）
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "数据迁移要简单可靠，不要耍花招"
 * ⚛️ Dan: "清晰的迁移状态和错误处理"
 * ☕ Bloch: "幂等性和防御性编程"
 * 🏛️ Fowler: "Repository 模式管理数据访问"
 *
 * @since v3.0.0
 * @updated v3.1.0 - 使用 StorageAdapter 替代直接的 Storage 依赖
 */

import { loggers } from "~/lib/logger"
import {
  type AccountData,
  type AccountRegistry,
  AccountVersion,
  type AuthStorage,
  type MigrationStatus,
  type NotificationStates,
  type PackyConfig,
  type PeerSpendingStorage,
  type SubscriptionApiResponse,
  type SystemPreferenceStorage,
  TokenType,
  type UserInfo
} from "~/types"
import { PackySite } from "~/types/account"

import {
  getStorageManager,
  type IStorageAdapter,
  StorageDomain
} from "../storage"
import { AccountManager } from "./AccountManager"

const logger = loggers.migration

/**
 * 数据迁移管理器
 *
 * 负责 v2.x 到 v3.1.0 的数据结构迁移
 */
export class DataMigrationManager {
  private accountManager: AccountManager
  private storage: IStorageAdapter

  constructor(accountManager: AccountManager, storage: IStorageAdapter) {
    this.accountManager = accountManager
    this.storage = storage
    logger.info("DataMigrationManager initialized")
  }

  /**
   * 获取迁移报告（用于调试和验证）
   *
   * @returns 包含所有相关存储键的详细报告
   */
  async getMigrationReport(): Promise<{
    accountRegistry: AccountRegistry | null
    accounts: Array<{
      accountId: string
      authKey: string
      hasAuth: boolean
      hasUserInfo: boolean
      site: PackySite
    }>
    migrationStatus: MigrationStatus | null
    oldKeys: {
      hasCodexSharedAuth: boolean
      hasPrivateAuth: boolean
      hasSharedAuth: boolean
    }
  }> {
    // 1. 获取账号注册表
    const registry = await this.storage.get<AccountRegistry>(
      StorageDomain.ACCOUNT_REGISTRY
    )

    // 2. 获取迁移状态
    const migrationStatus =
      await this.storage.get<MigrationStatus>("migration.v2_to_v3")

    // 3. 检查旧键
    const oldKeys = {
      hasCodexSharedAuth: !!(await this.storage.get("codex_shared.auth")),
      hasPrivateAuth: !!(await this.storage.get("private.auth")),
      hasSharedAuth: !!(await this.storage.get("shared.auth"))
    }

    // 4. 检查每个账号的数据
    const accounts: Array<{
      accountId: string
      authKey: string
      hasAuth: boolean
      hasUserInfo: boolean
      site: PackySite
    }> = []

    if (registry) {
      const storageManager = getStorageManager()

      for (const account of registry.accounts) {
        // v3.1.0+: 使用聚合存储键
        const storageKey = `account_${account.id}_info`
        const hasAuth = !!(await storageManager.getForAccount(
          account.id,
          StorageDomain.AUTH
        ))
        const hasUserInfo = !!(await storageManager.getForAccount(
          account.id,
          StorageDomain.USER_INFO
        ))

        accounts.push({
          accountId: account.id,
          authKey: storageKey, // 更新为聚合键
          hasAuth,
          hasUserInfo,
          site: account.site
        })
      }
    }

    return {
      accountRegistry: registry,
      accounts,
      migrationStatus,
      oldKeys
    }
  }

  /**
   * 执行数据迁移
   *
   * 迁移流程：
   * 1. 备份旧数据
   * 2. 为每个 v2.x 账号类型创建 Account 实体
   * 3. 迁移账号特定数据
   * 4. 创建 AccountRegistry
   * 5. 标记迁移完成
   *
   * @returns 迁移的账号数量
   */
  async migrate(): Promise<number> {
    logger.info("🚀 Starting data migration from v2.x to v3.0.0...")

    const startTime = Date.now()
    let migratedCount = 0

    try {
      // 1. 检查是否需要迁移
      const needs = await this.needsMigration()
      if (!needs) {
        return 0
      }

      // 2. 迁移每个账号类型
      const accountVersions: Array<{
        key: string
        type: AccountVersion
      }> = [
        { key: "shared", type: "shared" as AccountVersion },
        { key: "private", type: "private" as AccountVersion },
        { key: "codex_shared", type: "codex_shared" as AccountVersion }
      ]

      for (const { key, type } of accountVersions) {
        const migrated = await this.migrateAccountVersion(key, type)
        if (migrated) {
          migratedCount++
        }
      }

      // 3. 标记迁移完成
      await this.markMigrationComplete(migratedCount)

      // 4. 生成详细迁移报告
      const report = await this.getMigrationReport()

      const duration = Date.now() - startTime
      logger.info(
        `✅ Migration completed: ${migratedCount} accounts migrated in ${duration}ms`
      )

      // 5. 记录详细迁移报告
      logger.info("📊 Migration Report:")
      logger.info(`  - Total accounts: ${report.accounts.length}`)
      report.accounts.forEach((acc) => {
        logger.info(
          `  - Account ${acc.accountId} (${acc.site}): auth=${acc.hasAuth}, userInfo=${acc.hasUserInfo}`
        )
      })
      logger.info(`  - Old keys preserved:`)
      logger.info(`    - shared.auth: ${report.oldKeys.hasSharedAuth}`)
      logger.info(`    - private.auth: ${report.oldKeys.hasPrivateAuth}`)
      logger.info(
        `    - codex_shared.auth: ${report.oldKeys.hasCodexSharedAuth}`
      )

      return migratedCount
    } catch (error) {
      logger.error("❌ Migration failed:", error)
      throw error
    }
  }

  /**
   * 检查是否需要迁移
   *
   * 检测策略：
   * 1. 检查是否已完成迁移（migration.v2_to_v3 标记）
   * 2. 检查是否存在 v2.x 格式的数据
   *
   * @returns 是否需要迁移
   */
  async needsMigration(): Promise<boolean> {
    // 1. 检查迁移状态标记
    const migrationStatus =
      await this.storage.get<MigrationStatus>("migration.v2_to_v3")

    if (migrationStatus?.migrated) {
      logger.info("Migration already completed, skipping")
      return false
    }

    // 2. 检查是否存在 v2.x 数据（任一账号类型）
    const accountVersions: AccountVersion[] = [
      "shared" as AccountVersion,
      "private" as AccountVersion,
      "codex_shared" as AccountVersion
    ]

    for (const version of accountVersions) {
      const authKey = `${version}.auth`
      const auth = await this.storage.get<AuthStorage>(authKey)

      if (auth?.token) {
        logger.info(`Found v2.x data for: ${version}`)
        return true
      }
    }

    logger.info("No v2.x data found, migration not needed")
    return false
  }

  /**
   * 回滚迁移（紧急恢复用）
   *
   * ⚠️ 危险操作：仅在迁移出现严重问题时使用
   *
   * 策略：删除所有新创建的账号数据，保留原始 v2.x 数据
   */
  async rollback(): Promise<void> {
    logger.warn("⚠️ Rolling back migration...")

    try {
      // 1. 获取所有账号ID
      const storageManager = getStorageManager()
      const accountIds = await storageManager.getAllAccountIds()

      // 2. 删除每个账号的所有数据
      for (const accountId of accountIds) {
        await storageManager.clearAccountData(accountId)
        logger.debug(`Cleared account data: ${accountId}`)
      }

      // 3. 清空账号注册表
      await this.storage.remove(StorageDomain.ACCOUNT_REGISTRY)
      logger.debug("Cleared account registry")

      // 4. 清除迁移状态
      await this.storage.remove("migration.v2_to_v3")
      logger.debug("Cleared migration status")

      logger.warn(
        "✅ Rollback completed - all v3.0 data removed, v2.x data preserved"
      )
    } catch (error) {
      logger.error("❌ Rollback failed:", error)
      throw error
    }
  }

  /**
   * 提取 JWT Token 过期时间
   *
   * @param token JWT token 字符串
   * @returns 过期时间（毫秒时间戳），如果提取失败则返回 undefined
   */
  private extractTokenExpiry(token: string): number | undefined {
    try {
      // JWT 格式: header.payload.signature
      const parts = token.split(".")
      if (parts.length !== 3) {
        return undefined
      }

      // 解码 payload（Base64）
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
   * @version v3.5.0 改为基于 PackySite
   */
  private getDefaultDisplayName(site: PackySite): string {
    const names: Record<PackySite, string> = {
      [PackySite.CODEX]: "Codex 账号",
      [PackySite.SHARED]: "滴滴车账号",
      [PackySite.WWW]: "公交车账号"
    }
    return names[site]
  }

  /**
   * 将 v2.x 账号类型映射到 v3.5.0 站点
   *
   * @deprecated v3.5.0+ 仅用于 v2 迁移，业务逻辑请使用 PackySite
   * @internal 不要在新代码中使用此函数
   *
   * 映射规则：
   * - CODEX_SHARED → CODEX (codex.packycode.com)
   * - PRIVATE → SHARED (shared.packycode.com 滴滴车)
   * - SHARED → WWW (www.packycode.com 公交车)
   *
   * @version v3.5.0 新增
   */
  private mapAccountTypeToSite(type: AccountVersion): PackySite {
    const mapping: Record<AccountVersion, PackySite> = {
      [AccountVersion.CODEX_SHARED]: PackySite.CODEX,
      [AccountVersion.PRIVATE]: PackySite.SHARED,
      [AccountVersion.SHARED]: PackySite.WWW
    }
    return mapping[type]
  }

  /**
   * 标记迁移完成
   */
  private async markMigrationComplete(migratedCount: number): Promise<void> {
    const migrationStatus: MigrationStatus = {
      fromVersion: "v2.x",
      migrated: true,
      migratedAccounts: migratedCount,
      timestamp: Date.now(),
      toVersion: "v3.0.0"
    }

    await this.storage.set("migration.v2_to_v3", migrationStatus)
    logger.info("Migration status marked as complete")
  }

  /**
   * 迁移单个账号类型的数据
   *
   * 数据结构重构：
   * - Account 只包含表单字段
   * - AccountData 包含所有 API 派生字段
   *
   * @param versionKey v2.x 版本键（如 "shared"）
   * @param accountType 账号类型
   * @returns 是否成功迁移
   */
  private async migrateAccountVersion(
    versionKey: string,
    accountType: AccountVersion
  ): Promise<boolean> {
    logger.info(`Migrating account type: ${accountType}`)

    // 1. 读取 v2.x 认证数据
    const authKey = `${versionKey}.auth`
    const auth = await this.storage.get<AuthStorage>(authKey)

    if (!auth || !auth.token) {
      logger.info(`No auth data found for: ${accountType}`)
      return false
    }

    // 2. 创建账号实体（只包含表单字段）
    // v3.5.0+: 映射 AccountVersion → PackySite
    const site = this.mapAccountTypeToSite(accountType)

    try {
      const accountId = await this.accountManager.addAccount({
        displayName: this.getDefaultDisplayName(site),
        site,
        token: auth.token,
        tokenType: auth.type || TokenType.JWT
      })

      logger.info(`Created account: ${accountId} for type: ${accountType}`)

      // 3. 读取所有 v2.x 数据域
      logger.debug(`Reading all v2.x data for: ${versionKey}`)
      const userInfo = await this.storage.get<UserInfo>(
        `${versionKey}.user.info`
      )
      const subscriptionInfo = await this.storage.get<SubscriptionApiResponse>(
        `${versionKey}.subscription.info`
      )
      const systemPreference = await this.storage.get<SystemPreferenceStorage>(
        `${versionKey}.system.preference`
      )
      const purchaseConfig = await this.storage.get<PackyConfig>(
        `${versionKey}.purchase_config`
      )
      const notificationStates = await this.storage.get<NotificationStates>(
        `${versionKey}.notification.states`
      )

      // 滴滴车模式特有数据
      const peerSpending =
        versionKey === "private"
          ? await this.storage.get<PeerSpendingStorage>(
              `${versionKey}.peer.spending`
            )
          : null

      // 4. 聚合成 AccountData 对象（包含新增的 API 派生字段）
      const accountData: AccountData = {
        // === 原有 API 数据 ===
        auth: {
          token: auth.token,
          type: auth.type || TokenType.JWT,
          ...(auth.expiry && { expiry: auth.expiry })
        },
        // === 新增：API 派生字段 ===
        isValid: true, // 新创建的账号默认有效
        lastSyncAt: Date.now(),
        notificationStates: notificationStates || {},
        peerSpending: peerSpending || null,
        purchaseConfig: purchaseConfig || null,
        snapshot: undefined, // 初始无快照

        subscriptionInfo: subscriptionInfo || null,
        systemPreference: systemPreference || null,
        tokenExpiry:
          auth.type === TokenType.JWT
            ? this.extractTokenExpiry(auth.token)
            : undefined,
        userInfo: userInfo || null
      }

      // 5. 一次性写入聚合数据
      const storageKey = `account_${accountId}_info`
      await this.storage.set(storageKey, accountData)

      // 6. 日志记录
      logger.info(`✅ Migrated all data to: ${storageKey}`)
      logger.debug(`  - AUTH: ✓`)
      if (userInfo) logger.debug(`  - USER_INFO: ✓`)
      if (subscriptionInfo) logger.debug(`  - SUBSCRIPTION_INFO: ✓`)
      if (systemPreference) logger.debug(`  - SYSTEM_PREFERENCE: ✓`)
      if (purchaseConfig) logger.debug(`  - PURCHASE_CONFIG: ✓`)
      if (notificationStates) logger.debug(`  - NOTIFICATION_STATES: ✓`)
      if (peerSpending) logger.debug(`  - PEER_SPENDING: ✓`)
      logger.debug(
        `  - API_DERIVED_FIELDS: ✓ (isValid, tokenExpiry, lastSyncAt)`
      )

      return true
    } catch (error) {
      logger.error(`Failed to migrate ${accountType}:`, error)
      return false
    }
  }
}
