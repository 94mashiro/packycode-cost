/**
 * 账号类型适配层
 *
 * Linus: "抽象应该隐藏复杂性，而不是增加复杂性"
 * Dan: "适配器模式让不同的账号类型有统一的接口"
 */

import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { AccountVersion, type UserPreferenceStorage } from "~/types"

/**
 * 账号配置定义
 * 每种账号类型的所有相关配置都在这里统一管理
 */
export interface AccountConfig {
  /** 基础域名 */
  baseUrl: string
  /** Cookie 域名（用于获取JWT token） */
  cookieDomain: string
  /** 描述信息 */
  description: string
  /** API 端点配置 */
  endpoints: {
    apiKeysPattern: string
    config: string
    userInfo: string
  }
  /** 页面 URL 配置 */
  pages: {
    dashboard: string
    pricing: string
  }
  /** 账号类型 */
  type: AccountVersion
}

/**
 * 账号配置注册表 - 单一数据源
 * TypeScript 强制要求所有 AccountVersion 枚举值都有对应配置
 */
export const ACCOUNT_CONFIG_REGISTRY: Record<AccountVersion, AccountConfig> = {
  [AccountVersion.PRIVATE]: {
    baseUrl: "https://share.packycode.com",
    cookieDomain: "https://share.packycode.com",
    description: "私家车模式 - 私有账号系统",
    endpoints: {
      apiKeysPattern: "/api/backend/users/*/api-keys/*",
      config: "/api/config",
      userInfo: "/api/backend/users/info"
    },
    pages: {
      dashboard: "https://share.packycode.com/dashboard",
      pricing: "https://share.packycode.com/pricing"
    },
    type: AccountVersion.PRIVATE
  },
  [AccountVersion.SHARED]: {
    baseUrl: "https://www.packycode.com",
    cookieDomain: "https://www.packycode.com",
    description: "公交车模式 - 共享账号系统",
    endpoints: {
      apiKeysPattern: "/api/backend/users/*/api-keys/*",
      config: "/api/config",
      userInfo: "/api/backend/users/info"
    },
    pages: {
      dashboard: "https://www.packycode.com/dashboard",
      pricing: "https://www.packycode.com/pricing"
    },
    type: AccountVersion.SHARED
  }
}

/**
 * 账号适配器类
 * 提供统一的账号配置访问接口
 */
export class AccountAdapter {
  private readonly config: AccountConfig

  constructor(accountType: AccountVersion) {
    this.config = ACCOUNT_CONFIG_REGISTRY[accountType]
    if (!this.config) {
      throw new Error(`Unsupported account type: ${accountType}`)
    }
  }

  /**
   * 获取账号类型
   */
  getAccountType(): AccountVersion {
    return this.config.type
  }

  /**
   * 获取完整的 API 端点 URL
   */
  getApiUrl(endpoint: keyof AccountConfig["endpoints"]): string {
    return `${this.config.baseUrl}${this.config.endpoints[endpoint]}`
  }

  /**
   * 获取基础 URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl
  }

  /**
   * 获取 Cookie 域名
   */
  getCookieDomain(): string {
    return this.config.cookieDomain
  }

  /**
   * 获取描述信息
   */
  getDescription(): string {
    return this.config.description
  }

  /**
   * 获取完整配置（用于调试）
   */
  getFullConfig(): AccountConfig {
    return { ...this.config }
  }

  /**
   * 获取页面 URL
   */
  getPageUrl(page: keyof AccountConfig["pages"]): string {
    return this.config.pages[page]
  }

  /**
   * 检查 URL 是否属于当前账号类型
   */
  isUrlBelongsToAccount(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const configUrlObj = new URL(this.config.baseUrl)
      return urlObj.hostname === configUrlObj.hostname
    } catch {
      return false
    }
  }
}

/**
 * 账号适配器管理器
 * 基于存储的用户偏好动态获取账号配置
 */
export class AccountAdapterManager {
  private cachedAccountType: AccountVersion | null = null
  private cachedAdapter: AccountAdapter | null = null

  /**
   * 获取当前账号适配器
   * 自动从存储读取用户选择的账号类型
   */
  async getCurrentAdapter(): Promise<AccountAdapter> {
    const currentAccountType = await this.getCurrentAccountType()

    // 如果账号类型没有变化，返回缓存的适配器
    if (this.cachedAdapter && this.cachedAccountType === currentAccountType) {
      return this.cachedAdapter
    }

    // 创建新的适配器并缓存
    this.cachedAdapter = new AccountAdapter(currentAccountType)
    this.cachedAccountType = currentAccountType

    return this.cachedAdapter
  }

  /**
   * 获取当前账号类型的API URL
   */
  async getCurrentApiUrl(
    endpoint: keyof AccountConfig["endpoints"]
  ): Promise<string> {
    const adapter = await this.getCurrentAdapter()
    return adapter.getApiUrl(endpoint)
  }

  /**
   * 获取当前账号类型的基础URL
   */
  async getCurrentBaseUrl(): Promise<string> {
    const adapter = await this.getCurrentAdapter()
    return adapter.getBaseUrl()
  }

  /**
   * 获取当前账号类型的Cookie域名
   */
  async getCurrentCookieDomain(): Promise<string> {
    const adapter = await this.getCurrentAdapter()
    return adapter.getCookieDomain()
  }

  /**
   * 获取当前账号类型的页面URL
   */
  async getCurrentPageUrl(page: keyof AccountConfig["pages"]): Promise<string> {
    const adapter = await this.getCurrentAdapter()
    return adapter.getPageUrl(page)
  }

  /**
   * 检查URL是否属于当前账号类型
   */
  async isUrlBelongsToCurrentAccount(url: string): Promise<boolean> {
    const adapter = await this.getCurrentAdapter()
    return adapter.isUrlBelongsToAccount(url)
  }

  /**
   * 强制刷新适配器缓存
   * 在用户切换账号类型后调用
   */
  async refreshAdapter(): Promise<AccountAdapter> {
    this.cachedAdapter = null
    this.cachedAccountType = null
    return this.getCurrentAdapter()
  }

  /**
   * 获取当前用户选择的账号类型
   */
  private async getCurrentAccountType(): Promise<AccountVersion> {
    try {
      const storageManager = await getStorageManager()
      const userPreference = await storageManager.get<UserPreferenceStorage>(
        StorageDomain.USER_PREFERENCE
      )

      // 默认使用共享模式（公交车）
      return userPreference?.account_version ?? AccountVersion.SHARED
    } catch {
      // 出错时默认使用共享模式
      return AccountVersion.SHARED
    }
  }
}

/**
 * 全局账号适配器管理器实例
 * 单例模式，整个应用共享一个实例
 */
export const accountAdapterManager = new AccountAdapterManager()

/**
 * 便捷函数：获取当前账号适配器
 */
export async function getCurrentAccountAdapter(): Promise<AccountAdapter> {
  return accountAdapterManager.getCurrentAdapter()
}

/**
 * 便捷函数：获取当前API URL
 */
export async function getCurrentApiUrl(
  endpoint: keyof AccountConfig["endpoints"]
): Promise<string> {
  return accountAdapterManager.getCurrentApiUrl(endpoint)
}

/**
 * 便捷函数：获取当前基础URL
 */
export async function getCurrentBaseUrl(): Promise<string> {
  return accountAdapterManager.getCurrentBaseUrl()
}

/**
 * 便捷函数：获取当前Cookie域名
 */
export async function getCurrentCookieDomain(): Promise<string> {
  return accountAdapterManager.getCurrentCookieDomain()
}

/**
 * 便捷函数：获取当前页面URL
 */
export async function getCurrentPageUrl(
  page: keyof AccountConfig["pages"]
): Promise<string> {
  return accountAdapterManager.getCurrentPageUrl(page)
}
