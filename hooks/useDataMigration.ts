/**
 * useDataMigration - 数据迁移 Hook
 *
 * 功能：
 * 1. 检测是否需要迁移
 * 2. 执行数据迁移
 * 3. 提供迁移状态和进度
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "迁移要快速可靠，不要阻塞用户"
 * ⚛️ Dan: "清晰的加载状态和错误处理"
 * ☕ Bloch: "幂等性保证，可重复执行"
 * 🏛️ Fowler: "单一职责，只负责迁移逻辑"
 */

import { useCallback, useEffect, useState } from "react"

import { AccountManager, DataMigrationManager } from "../lib/account"
import { createDefaultStorageAdapter, getStorageManager } from "../lib/storage"

interface MigrationState {
  error: null | string
  inProgress: boolean
  migratedCount: number
  needsMigration: boolean
}

/**
 * 数据迁移 Hook
 *
 * @example
 * ```typescript
 * function MigrationDialog() {
 *   const { needsMigration, inProgress, migrate, error } = useDataMigration()
 *
 *   if (!needsMigration) {
 *     return null
 *   }
 *
 *   return (
 *     <Dialog>
 *       <h2>数据迁移</h2>
 *       <p>检测到旧版本数据，需要迁移到新架构</p>
 *       <Button onClick={migrate} disabled={inProgress}>
 *         {inProgress ? "迁移中..." : "开始迁移"}
 *       </Button>
 *       {error && <ErrorMessage>{error}</ErrorMessage>}
 *     </Dialog>
 *   )
 * }
 * ```
 */
export function useDataMigration() {
  const [state, setState] = useState<MigrationState>({
    error: null,
    inProgress: false,
    migratedCount: 0,
    needsMigration: false
  })

  // 创建 DataMigrationManager 实例
  const getMigrationManager = useCallback(() => {
    const storageAdapter = createDefaultStorageAdapter()
    const storageManager = getStorageManager()
    const accountManager = new AccountManager(storageManager)
    return new DataMigrationManager(accountManager, storageAdapter)
  }, [])

  /**
   * 检查是否需要迁移
   */
  const checkMigration = useCallback(async () => {
    try {
      const manager = getMigrationManager()
      const needs = await manager.needsMigration()

      setState((prev) => ({
        ...prev,
        needsMigration: needs
      }))

      return needs
    } catch (err) {
      console.error("Failed to check migration status:", err)
      return false
    }
  }, [getMigrationManager])

  /**
   * 执行迁移
   */
  const migrate = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({
        ...prev,
        error: null,
        inProgress: true
      }))

      const manager = getMigrationManager()
      const count = await manager.migrate()

      setState((prev) => ({
        ...prev,
        inProgress: false,
        migratedCount: count,
        needsMigration: false
      }))

      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Migration failed"

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        inProgress: false
      }))

      console.error("Migration failed:", err)
      return false
    }
  }, [getMigrationManager])

  /**
   * 回滚迁移（紧急恢复）
   */
  const rollback = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({
        ...prev,
        error: null,
        inProgress: true
      }))

      const manager = getMigrationManager()
      await manager.rollback()

      setState((prev) => ({
        ...prev,
        inProgress: false,
        migratedCount: 0,
        needsMigration: true
      }))

      return true
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Rollback failed"

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        inProgress: false
      }))

      console.error("Rollback failed:", err)
      return false
    }
  }, [getMigrationManager])

  // 初始检查
  useEffect(() => {
    checkMigration()
  }, [checkMigration])

  return {
    // 操作方法
    checkMigration,
    // 状态
    error: state.error,
    inProgress: state.inProgress,
    migrate,

    migratedCount: state.migratedCount,
    needsMigration: state.needsMigration,
    rollback
  }
}
