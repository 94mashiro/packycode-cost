/**
 * API 配置管理器
 *
 * Linus: "API 配置应该自包含，不依赖外部模块"
 * Dan: "清晰的命名让开发者立即理解模块用途"
 */

import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import {
  AccountVersion,
  ApiEndpointType,
  PageUrlType,
  type UserPreferenceStorage
} from "~/types"

/**
 * API 环境配置定义
 * 每种 API 环境的所有相关配置都在这里统一管理
 */
export interface ApiEnvironmentConfig {
  /** 基础域名 */
  baseUrl: string
  /** Cookie 域名（用于获取JWT token） */
  cookieDomain: string
  /** 描述信息 */
  description: string
  /** API 端点配置 - 使用枚举值作为键确保类型安全 */
  endpoints: Record<ApiEndpointType, string>
  /** 页面 URL 配置 - 使用枚举值作为键确保类型安全 */
  pages: Record<PageUrlType, string>
  /** API 环境类型 */
  type: AccountVersion
}

/**
 * API 环境配置注册表 - 单一数据源
 * TypeScript 强制要求所有 AccountVersion 枚举值都有对应配置
 */
export const API_ENVIRONMENT_REGISTRY: Record<
  AccountVersion,
  ApiEnvironmentConfig
> = {
  [AccountVersion.PRIVATE]: {
    baseUrl: "https://share.packycode.com",
    cookieDomain: "https://share.packycode.com",
    description: "滴滴车模式 - 私有 API 环境",
    endpoints: {
      [ApiEndpointType.API_KEYS_PATTERN]: "/api/backend/users/*/api-keys/*",
      [ApiEndpointType.CONFIG]: "/api/config",
      [ApiEndpointType.SHARED_SPACE]: "/api/backend/accounts/my-assignments",
      [ApiEndpointType.SUBSCRIPTIONS]:
        "/api/backend/subscriptions?page=1&per_page=50",
      [ApiEndpointType.USER_INFO]: "/api/backend/users/info"
    },
    pages: {
      [PageUrlType.DASHBOARD]: "https://share.packycode.com/dashboard",
      [PageUrlType.PRICING]: "https://share.packycode.com/pricing"
    },
    type: AccountVersion.PRIVATE
  },
  [AccountVersion.SHARED]: {
    baseUrl: "https://www.packycode.com",
    cookieDomain: "https://www.packycode.com",
    description: "公交车模式 - 共享 API 环境",
    endpoints: {
      [ApiEndpointType.API_KEYS_PATTERN]: "/api/backend/users/*/api-keys/*",
      [ApiEndpointType.CONFIG]: "/api/config",
      [ApiEndpointType.SHARED_SPACE]: "/api/backend/accounts/my-assignments",
      [ApiEndpointType.SUBSCRIPTIONS]:
        "/api/backend/subscriptions?page=1&per_page=50",
      [ApiEndpointType.USER_INFO]: "/api/backend/users/info"
    },
    pages: {
      [PageUrlType.DASHBOARD]: "https://www.packycode.com/dashboard",
      [PageUrlType.PRICING]: "https://www.packycode.com/pricing"
    },
    type: AccountVersion.SHARED
  }
}

/**
 * API 配置管理器类
 * 提供统一的 API 配置访问接口
 */
export class ApiConfigManager {
  private readonly config: ApiEnvironmentConfig

  constructor(accountType: AccountVersion) {
    this.config = API_ENVIRONMENT_REGISTRY[accountType]
    if (!this.config) {
      throw new Error(`Unsupported API environment: ${accountType}`)
    }
  }

  /**
   * 获取 API 环境类型
   */
  getAccountType(): AccountVersion {
    return this.config.type
  }

  /**
   * 获取完整的 API 端点 URL
   */
  getApiUrl(endpoint: keyof ApiEnvironmentConfig["endpoints"]): string {
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
  getFullConfig(): ApiEnvironmentConfig {
    return { ...this.config }
  }

  /**
   * 获取页面 URL
   */
  getPageUrl(page: keyof ApiEnvironmentConfig["pages"]): string {
    return this.config.pages[page]
  }

  /**
   * 检查 URL 是否属于当前 API 环境
   */
  isUrlBelongsToEnvironment(url: string): boolean {
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
 * API 配置管理器的管理器
 * 基于存储的用户偏好动态获取 API 配置
 */
export class ApiConfigManagerController {
  private cachedAccountType: AccountVersion | null = null
  private cachedConfigManager: ApiConfigManager | null = null

  /**
   * 获取当前账号类型的API URL (类型安全版本)
   */
  async getCurrentApiUrl(endpoint: ApiEndpointType): Promise<string> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.getApiUrl(endpoint)
  }

  /**
   * 获取当前账号类型的基础URL
   */
  async getCurrentBaseUrl(): Promise<string> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.getBaseUrl()
  }

  /**
   * 获取当前 API 配置管理器
   * 自动从存储读取用户选择的 API 环境类型
   */
  async getCurrentConfigManager(): Promise<ApiConfigManager> {
    const currentAccountType = await this.getCurrentAccountType()

    // 如果 API 环境类型没有变化，返回缓存的管理器
    if (
      this.cachedConfigManager &&
      this.cachedAccountType === currentAccountType
    ) {
      return this.cachedConfigManager
    }

    // 创建新的管理器并缓存
    this.cachedConfigManager = new ApiConfigManager(currentAccountType)
    this.cachedAccountType = currentAccountType

    return this.cachedConfigManager
  }

  /**
   * 获取当前账号类型的Cookie域名
   */
  async getCurrentCookieDomain(): Promise<string> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.getCookieDomain()
  }

  /**
   * 获取当前账号类型的页面URL (类型安全版本)
   */
  async getCurrentPageUrl(page: PageUrlType): Promise<string> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.getPageUrl(page)
  }

  /**
   * 检查URL是否属于当前账号类型
   */
  async isUrlBelongsToCurrentAccount(url: string): Promise<boolean> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.isUrlBelongsToEnvironment(url)
  }

  /**
   * 强制刷新适配器缓存
   * 在用户切换账号类型后调用
   */
  async refreshConfigManager(): Promise<ApiConfigManager> {
    this.cachedConfigManager = null
    this.cachedAccountType = null
    return this.getCurrentConfigManager()
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
 * 全局 API 配置管理器实例
 * 单例模式，整个应用共享一个实例
 */
export const apiConfigManagerController = new ApiConfigManagerController()

/**
 * 便捷函数：获取当前 API 配置管理器
 */
export async function getCurrentApiConfigManager(): Promise<ApiConfigManager> {
  return apiConfigManagerController.getCurrentConfigManager()
}

/**
 * 便捷函数：获取当前API URL (类型安全版本)
 * Joshua Bloch: "简洁的接口胜过复杂的重载"
 */
export async function getCurrentApiUrl(
  endpoint: ApiEndpointType
): Promise<string> {
  return apiConfigManagerController.getCurrentApiUrl(endpoint)
}

/**
 * 便捷函数：获取当前基础URL
 */
export async function getCurrentBaseUrl(): Promise<string> {
  return apiConfigManagerController.getCurrentBaseUrl()
}

/**
 * 便捷函数：获取当前Cookie域名
 */
export async function getCurrentCookieDomain(): Promise<string> {
  return apiConfigManagerController.getCurrentCookieDomain()
}

/**
 * 便捷函数：获取当前页面URL (类型安全版本)
 * Martin Fowler: "明确的类型约束让代码意图更清晰"
 */
export async function getCurrentPageUrl(page: PageUrlType): Promise<string> {
  return apiConfigManagerController.getCurrentPageUrl(page)
}
