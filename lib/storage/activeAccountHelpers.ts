/**
 * 活动账号数据访问辅助函数
 *
 * 用途：
 * - 在应用层（background/popup/components）简化常见的"当前账号"操作
 * - 封装"获取当前账号ID + 调用存储管理器"的重复模式
 * - 提供清晰的语义：ActiveAccount 明确表达了操作对象
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "便捷方法，但不隐藏底层逻辑"
 * ⚛️ Dan: "显式依赖，每次都从 AccountManager 获取当前账号"
 * ☕ Bloch: "命名表达意图，ActiveAccount 不会被误解为全局状态"
 * 🏛️ Fowler: "应用层职责，封装常见业务模式"
 *
 * 使用场景：
 * - ✅ 应用层代码（background.ts, components, services）
 * - ❌ 模块层代码（modules/*）应直接使用 storageManager.get(accountId, domain)
 */

import { AccountManager } from "~/lib/account"
import { loggers } from "~/lib/logger"

import { getStorageManager } from "./index"

const logger = loggers.storage

/**
 * 获取当前激活账号的数据（便捷方法）
 *
 * 实现逻辑：
 * 1. 从 AccountManager 获取当前激活账号
 * 2. 调用 StorageManager.get(accountId, domain)
 *
 * @param domain 存储域
 * @returns 数据或 null（如果没有激活账号，返回 null）
 *
 * @example
 * ```typescript
 * const authData = await getActiveAccountData(StorageDomain.AUTH)
 * if (authData) {
 *   console.log("Token:", authData.token)
 * }
 * ```
 */
export async function getActiveAccountData<T>(
  domain: string
): Promise<null | T> {
  try {
    const storageManager = getStorageManager()
    const accountManager = new AccountManager(storageManager)
    const currentAccount = await accountManager.getCurrentAccount()

    if (!currentAccount) {
      logger.debug("No active account, getActiveAccountData returning null")
      return null
    }

    return await storageManager.get<T>(currentAccount.id, domain)
  } catch (error) {
    logger.error(`getActiveAccountData error for domain ${domain}:`, error)
    return null
  }
}

/**
 * 设置当前激活账号的数据（便捷方法）
 *
 * 实现逻辑：
 * 1. 从 AccountManager 获取当前激活账号
 * 2. 调用 StorageManager.set(accountId, domain, value, override)
 *
 * @param domain 存储域
 * @param value 数据值
 * @param override 是否覆盖（默认深度合并）
 * @throws 如果没有激活账号
 *
 * @example
 * ```typescript
 * await setActiveAccountData(StorageDomain.USER_INFO, { name: "John" })
 * ```
 */
export async function setActiveAccountData<T>(
  domain: string,
  value: T,
  override = false
): Promise<void> {
  try {
    const storageManager = getStorageManager()
    const accountManager = new AccountManager(storageManager)
    const currentAccount = await accountManager.getCurrentAccount()

    if (!currentAccount) {
      throw new Error("No active account. Please add an account first.")
    }

    await storageManager.set(currentAccount.id, domain, value, override)
  } catch (error) {
    logger.error(`setActiveAccountData error for domain ${domain}:`, error)
    throw error
  }
}

/**
 * 删除当前激活账号的数据（便捷方法）
 *
 * 实现逻辑：
 * 1. 从 AccountManager 获取当前激活账号
 * 2. 调用 StorageManager.remove(accountId, domain)
 *
 * @param domain 存储域
 * @throws 如果没有激活账号
 *
 * @example
 * ```typescript
 * await removeActiveAccountData(StorageDomain.AUTH)
 * ```
 */
export async function removeActiveAccountData(domain: string): Promise<void> {
  try {
    const storageManager = getStorageManager()
    const accountManager = new AccountManager(storageManager)
    const currentAccount = await accountManager.getCurrentAccount()

    if (!currentAccount) {
      throw new Error("No active account. Please add an account first.")
    }

    await storageManager.remove(currentAccount.id, domain)
  } catch (error) {
    logger.error(`removeActiveAccountData error for domain ${domain}:`, error)
    throw error
  }
}

/**
 * 获取当前激活账号的ID（便捷方法）
 *
 * 实现逻辑：
 * 1. 从 AccountManager 获取当前激活账号
 * 2. 返回账号ID
 *
 * @returns 当前激活账号ID，如果没有则返回 null
 *
 * @example
 * ```typescript
 * const accountId = await getActiveAccountId()
 * if (accountId) {
 *   console.log("Current account:", accountId)
 * }
 * ```
 */
export async function getActiveAccountId(): Promise<null | string> {
  try {
    const storageManager = getStorageManager()
    const accountManager = new AccountManager(storageManager)
    const currentAccount = await accountManager.getCurrentAccount()

    return currentAccount?.id ?? null
  } catch (error) {
    logger.error("getActiveAccountId error:", error)
    return null
  }
}
