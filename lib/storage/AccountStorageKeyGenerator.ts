/**
 * 存储键生成器 - 多账号存储键管理
 *
 * Linus 原则: "简单的问题用简单的方法解决"
 * 职责: 负责生成和解析账号特定的存储键
 *
 * @since v3.0.0
 */

import { StorageDomain } from "./domains"

/**
 * 账号存储键生成器
 *
 * 存储键格式:
 * - 账号特定数据: `account_{accountId}.{domain}`
 * - 全局数据: 直接使用 domain (如 global.account.registry)
 *
 * 示例:
 * - generateKey("uuid-1234", "auth") → "account_uuid-1234.auth"
 * - generateKey("uuid-5678", "user.info") → "account_uuid-5678.user.info"
 */
export class AccountStorageKeyGenerator {
  private static readonly ACCOUNT_PREFIX = "account_"
  private static readonly SEPARATOR = "."

  /**
   * 生成账号特定的存储键
   *
   * @param accountId 账号ID
   * @param domain 存储域
   * @returns 完整的存储键
   *
   * @example
   * ```typescript
   * // 生成认证信息的存储键
   * const key = AccountStorageKeyGenerator.generateKey("uuid-1234", StorageDomain.AUTH)
   * // => "account_uuid-1234.auth"
   *
   * // 生成用户信息的存储键
   * const key = AccountStorageKeyGenerator.generateKey("uuid-5678", StorageDomain.FINANCE)
   * // => "account_uuid-5678.user.info"
   * ```
   */
  static generateKey(accountId: string, domain: string): string {
    if (!accountId || typeof accountId !== "string") {
      throw new Error(`Invalid accountId: ${accountId}`)
    }

    if (!domain || typeof domain !== "string") {
      throw new Error(`Invalid domain: ${domain}`)
    }

    // 全局域不添加账号前缀
    if (this.isGlobalDomain(domain)) {
      return domain
    }

    return `${this.ACCOUNT_PREFIX}${accountId}${this.SEPARATOR}${domain}`
  }

  /**
   * 生成账号键模式（用于批量查询）
   *
   * @param accountId 账号ID
   * @returns 账号键前缀模式
   *
   * @example
   * ```typescript
   * // 获取某个账号的所有键
   * const pattern = AccountStorageKeyGenerator.getAccountKeyPattern("uuid-1234")
   * // => "account_uuid-1234."
   * // 可以用于过滤: allKeys.filter(key => key.startsWith(pattern))
   * ```
   */
  static getAccountKeyPattern(accountId: string): string {
    return `${this.ACCOUNT_PREFIX}${accountId}${this.SEPARATOR}`
  }

  /**
   * 检查是否为账号特定键
   *
   * @param key 存储键
   * @returns 是否为账号键
   *
   * @example
   * ```typescript
   * AccountStorageKeyGenerator.isAccountKey("account_uuid-1234.auth") // => true
   * AccountStorageKeyGenerator.isAccountKey("global.account.registry") // => false
   * ```
   */
  static isAccountKey(key: string): boolean {
    return key.startsWith(this.ACCOUNT_PREFIX)
  }

  /**
   * 检查是否为全局域
   *
   * @param domain 存储域
   * @returns 是否为全局域
   *
   * @example
   * ```typescript
   * AccountStorageKeyGenerator.isGlobalDomain(StorageDomain.ACCOUNT_REGISTRY) // => true
   * AccountStorageKeyGenerator.isGlobalDomain(StorageDomain.AUTH) // => false
   * ```
   */
  static isGlobalDomain(domain: string): boolean {
    return (
      domain === StorageDomain.ACCOUNT_REGISTRY ||
      domain === StorageDomain.USER_PREFERENCE ||
      domain.startsWith("global.")
    )
  }

  /**
   * 验证账号ID格式
   *
   * @param accountId 账号ID
   * @returns 是否为有效的账号ID
   *
   * 验证规则:
   * - 不为空
   * - 长度在 4-64 字符之间
   * - 只包含字母、数字、连字符、下划线
   */
  static isValidAccountId(accountId: string): boolean {
    if (!accountId || typeof accountId !== "string") {
      return false
    }

    // 长度检查
    if (accountId.length < 4 || accountId.length > 64) {
      return false
    }

    // 格式检查（只允许字母、数字、连字符、下划线）
    const validPattern = /^[a-zA-Z0-9_-]+$/
    return validPattern.test(accountId)
  }

  /**
   * 解析存储键获取账号ID
   *
   * @param key 存储键
   * @returns 账号ID 或 null（如果不是账号键）
   *
   * @example
   * ```typescript
   * // 解析账号键
   * const accountId = AccountStorageKeyGenerator.parseAccountId("account_uuid-1234.auth")
   * // => "uuid-1234"
   *
   * // 解析全局键
   * const accountId = AccountStorageKeyGenerator.parseAccountId("global.account.registry")
   * // => null
   * ```
   */
  static parseAccountId(key: string): null | string {
    if (!this.isAccountKey(key)) {
      return null
    }

    const match = key.match(
      new RegExp(
        `^${this.ACCOUNT_PREFIX}([^${this.SEPARATOR}]+)${this.SEPARATOR}`
      )
    )

    return match ? match[1] : null
  }

  /**
   * 解析存储键获取域名
   *
   * @param key 存储键
   * @returns 存储域
   *
   * @example
   * ```typescript
   * // 解析账号键的域
   * const domain = AccountStorageKeyGenerator.parseDomain("account_uuid-1234.auth")
   * // => "auth"
   *
   * // 解析全局键的域
   * const domain = AccountStorageKeyGenerator.parseDomain("global.account.registry")
   * // => "global.account.registry"
   * ```
   */
  static parseDomain(key: string): null | string {
    if (this.isAccountKey(key)) {
      const match = key.match(
        new RegExp(
          `^${this.ACCOUNT_PREFIX}[^${this.SEPARATOR}]+${this.SEPARATOR}(.+)$`
        )
      )
      return match ? match[1] : null
    }

    // 全局键返回完整键名
    return key
  }

  /**
   * 从键中提取账号和域信息
   *
   * @param key 存储键
   * @returns 解析结果
   *
   * @example
   * ```typescript
   * const parsed = AccountStorageKeyGenerator.parseKey("account_uuid-1234.auth")
   * // => { accountId: "uuid-1234", domain: "auth", isGlobal: false }
   *
   * const parsed = AccountStorageKeyGenerator.parseKey("global.account.registry")
   * // => { accountId: null, domain: "global.account.registry", isGlobal: true }
   * ```
   */
  static parseKey(key: string): {
    accountId: null | string
    domain: null | string
    isGlobal: boolean
  } {
    const isAccountKey = this.isAccountKey(key)

    if (isAccountKey) {
      return {
        accountId: this.parseAccountId(key),
        domain: this.parseDomain(key),
        isGlobal: false
      }
    }

    return {
      accountId: null,
      domain: key,
      isGlobal: true
    }
  }
}
