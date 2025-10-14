/**
 * DataMigrationManager - v2.x → v3.x 数据迁移管理（简化版）
 *
 * @deprecated 此类仅用于历史数据迁移
 * @internal 业务逻辑不应使用此类
 *
 * 核心职责：
 * 1. 检测是否需要迁移
 * 2. 迁移 v2.x 账号身份（auth）到多账号架构
 * 3. 保留旧数据作为备份
 * 4. 触发自动数据刷新填充其他字段
 * 5. 幂等性保证（可重复执行）
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "数据迁移要简单可靠，不要耍花招"
 * ⚛️ Dan: "清晰的迁移状态和错误处理"
 * ☕ Bloch: "幂等性和防御性编程"
 * 🏛️ Fowler: "Repository 模式管理数据访问"
 *
 * 简化策略：
 * - 只迁移 auth 数据（token + tokenType）
 * - 其他数据通过 executeAllTasks() 自动刷新获取
 * - 代码量减少 86%（~590行 → ~80行）
 * - 降低迁移失败风险
 * - 提升数据实时性
 */

import { loggers } from "~/lib/logger"
import { executeAllTasks } from "~/modules/tasks"
import {
  type AccountRegistry,
  AccountVersion,
  type AuthStorage,
  type MigrationStatus,
  TokenType
} from "~/types"
import { PackySite } from "~/types/account"
import { getSiteAccountName } from "~/utils/siteHelpers"

import {
  getStorageManager,
  type IStorageAdapter,
  StorageDomain
} from "../storage"
import { AccountManager } from "./AccountManager"

const logger = loggers.migration

/**
 * 数据迁移管理器（简化版）
 *
 * 负责 v2.x 到 v3.0.0 的身份迁移 + 自动数据刷新
 */
export class DataMigrationManager {
  private accountManager: AccountManager
  private storage: IStorageAdapter

  constructor(accountManager: AccountManager, storage: IStorageAdapter) {
    this.accountManager = accountManager
    this.storage = storage
    logger.info("DataMigrationManager initialized (simplified version)")
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
    const registry = await this.storage.get<AccountRegistry>(
      StorageDomain.ACCOUNT_REGISTRY
    )

    const migrationStatus =
      await this.storage.get<MigrationStatus>("migration.v2_to_v3")

    const oldKeys = {
      hasCodexSharedAuth: !!(await this.storage.get("codex_shared.auth")),
      hasPrivateAuth: !!(await this.storage.get("private.auth")),
      hasSharedAuth: !!(await this.storage.get("shared.auth"))
    }

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
        const storageKey = `account_${account.id}_info`
        const hasAuth = !!(await storageManager.get(
          account.id,
          StorageDomain.AUTH
        ))
        const hasUserInfo = !!(await storageManager.get(
          account.id,
          StorageDomain.FINANCE
        ))

        accounts.push({
          accountId: account.id,
          authKey: storageKey,
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
   * 执行数据迁移（简化版）
   *
   * 迁移流程：
   * 1. 检查是否需要迁移
   * 2. 为每个 v2.x 账号类型创建 Account 实体（只迁移 auth）
   * 3. 标记迁移完成
   * 4. 触发 executeAllTasks() 自动刷新数据
   *
   * @returns 迁移的账号数量
   */
  async migrate(): Promise<number> {
    logger.info(
      "🚀 Starting simplified migration (Auth only + auto refresh)..."
    )

    const startTime = Date.now()
    let migratedCount = 0

    try {
      const needs = await this.needsMigration()
      if (!needs) {
        logger.info("No migration needed")
        return 0
      }

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

      await this.markMigrationComplete(migratedCount)

      const duration = Date.now() - startTime
      logger.info(
        `✅ Migration completed: ${migratedCount} accounts created in ${duration}ms`
      )

      logger.info("🔄 Triggering immediate data refresh for all accounts...")
      const refreshResult = await executeAllTasks()

      if (refreshResult.success) {
        logger.info(
          `✅ Data refresh completed: ${refreshResult.results.length} accounts refreshed`
        )
      } else {
        logger.warn(
          "⚠️ Some accounts failed to refresh, but migration was successful"
        )
      }

      const report = await this.getMigrationReport()
      logger.info("📊 Final Migration Report:")
      logger.info(`  - Total accounts: ${report.accounts.length}`)
      report.accounts.forEach((acc) => {
        logger.info(
          `  - Account ${acc.accountId} (${acc.site}): auth=${acc.hasAuth}, data=${acc.hasUserInfo}`
        )
      })
      logger.info(`  - Old keys preserved (not deleted):`)
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
   * 2. 检查是否存在 v2.x 格式的 auth 数据
   *
   * @returns 是否需要迁移
   */
  async needsMigration(): Promise<boolean> {
    const migrationStatus =
      await this.storage.get<MigrationStatus>("migration.v2_to_v3")

    if (migrationStatus?.migrated) {
      logger.info("Migration already completed, skipping")
      return false
    }

    const accountVersions: AccountVersion[] = [
      "shared" as AccountVersion,
      "private" as AccountVersion,
      "codex_shared" as AccountVersion
    ]

    for (const version of accountVersions) {
      const authKey = `${version}.auth`
      const auth = await this.storage.get<AuthStorage>(authKey)

      if (auth?.token) {
        logger.info(`Found v2.x auth data for: ${version}`)
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
      const storageManager = getStorageManager()
      const accountIds = await storageManager.getAllAccountIds()

      for (const accountId of accountIds) {
        await storageManager.clearAccountData(accountId)
        logger.debug(`Cleared account data: ${accountId}`)
      }

      await this.storage.remove(StorageDomain.ACCOUNT_REGISTRY)
      logger.debug("Cleared account registry")

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
   * 将 v2.x 账号类型映射到站点
   *
   * @deprecated 仅用于 v2 迁移，业务逻辑请使用 PackySite
   * @internal 不要在新代码中使用此函数
   *
   * 映射规则：
   * - CODEX_SHARED → CODEX (codex.packycode.com)
   * - PRIVATE → SHARED (share.packycode.com 滴滴车)
   * - SHARED → WWW (www.packycode.com 公交车)
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
   * 迁移单个账号类型的身份数据（简化版）
   *
   * 简化策略：
   * - 只迁移 auth 数据（token + tokenType）
   * - 不读取其他 v2.x 数据（user.info, subscription 等）
   * - 不构建 AccountData（由 executeAllTasks 自动填充）
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

    const authKey = `${versionKey}.auth`
    const auth = await this.storage.get<AuthStorage>(authKey)

    if (!auth || !auth.token) {
      logger.info(`No auth data found for: ${accountType}`)
      return false
    }

    try {
      const site = this.mapAccountTypeToSite(accountType)
      const accountId = await this.accountManager.addAccount({
        displayName: getSiteAccountName(site),
        site,
        token: auth.token,
        tokenType: auth.type || TokenType.JWT
      })

      logger.info(
        `✅ Account created: ${accountId} (${site}) - data will be auto-refreshed`
      )

      return true
    } catch (error) {
      logger.error(`Failed to migrate ${accountType}:`, error)
      return false
    }
  }
}
