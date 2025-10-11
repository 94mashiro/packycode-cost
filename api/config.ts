/**
 * API 配置管理器
 *
 * Linus: "API 配置应该自包含，不依赖外部模块"
 * Dan: "清晰的命名让开发者立即理解模块用途"
 */

import { ApiEndpointType, PageUrlType } from "~/types"
import { PackySite } from "~/types/account"

/**
 * API 环境配置定义
 * 每种 API 环境的所有相关配置都在这里统一管理
 *
 * @version v3.5.0 改为基于 PackySite 而非 AccountVersion
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
  /** 站点类型 */
  site: PackySite
}

/**
 * API 环境配置注册表 - 单一数据源
 * TypeScript 强制要求所有 PackySite 枚举值都有对应配置
 *
 * @version v3.5.0 改为基于 PackySite 索引
 */
export const API_ENVIRONMENT_REGISTRY: Record<PackySite, ApiEnvironmentConfig> =
  {
    [PackySite.CODEX]: {
      baseUrl: "https://codex.packycode.com",
      cookieDomain: "https://codex.packycode.com",
      description: "Codex公交车模式 - Codex服务的公交车版本",
      endpoints: {
        [ApiEndpointType.API_KEYS_PATTERN]: "/api/backend/users/*/api-keys/*",
        [ApiEndpointType.CONFIG]: "/api/config",
        [ApiEndpointType.PEER_SPENDING_TODAY]:
          "/api/backend/accounts/peer-spending/today",
        [ApiEndpointType.SHARED_SPACE]: "/api/backend/accounts/my-assignments",
        [ApiEndpointType.SUBSCRIPTIONS]:
          "/api/backend/subscriptions?page=1&per_page=50",
        [ApiEndpointType.USER_INFO]: "/api/backend/users/info"
      },
      pages: {
        [PageUrlType.DASHBOARD]: "https://codex.packycode.com/dashboard",
        [PageUrlType.PRICING]: "https://codex.packycode.com/pricing"
      },
      site: PackySite.CODEX
    },
    [PackySite.SHARED]: {
      baseUrl: "https://share.packycode.com",
      cookieDomain: "https://share.packycode.com",
      description: "滴滴车模式 - 私有 API 环境",
      endpoints: {
        [ApiEndpointType.API_KEYS_PATTERN]: "/api/backend/users/*/api-keys/*",
        [ApiEndpointType.CONFIG]: "/api/config",
        [ApiEndpointType.PEER_SPENDING_TODAY]:
          "/api/backend/accounts/peer-spending/today",
        [ApiEndpointType.SHARED_SPACE]: "/api/backend/accounts/my-assignments",
        [ApiEndpointType.SUBSCRIPTIONS]:
          "/api/backend/subscriptions?page=1&per_page=50",
        [ApiEndpointType.USER_INFO]: "/api/backend/users/info"
      },
      pages: {
        [PageUrlType.DASHBOARD]: "https://share.packycode.com/dashboard",
        [PageUrlType.PRICING]: "https://share.packycode.com/pricing"
      },
      site: PackySite.SHARED
    },
    [PackySite.WWW]: {
      baseUrl: "https://www.packycode.com",
      cookieDomain: "https://www.packycode.com",
      description: "公交车模式 - 共享 API 环境",
      endpoints: {
        [ApiEndpointType.API_KEYS_PATTERN]: "/api/backend/users/*/api-keys/*",
        [ApiEndpointType.CONFIG]: "/api/config",
        [ApiEndpointType.PEER_SPENDING_TODAY]:
          "/api/backend/accounts/peer-spending/today", // 不会使用，但需要定义
        [ApiEndpointType.SHARED_SPACE]: "/api/backend/accounts/my-assignments",
        [ApiEndpointType.SUBSCRIPTIONS]:
          "/api/backend/subscriptions?page=1&per_page=50",
        [ApiEndpointType.USER_INFO]: "/api/backend/users/info"
      },
      pages: {
        [PageUrlType.DASHBOARD]: "https://www.packycode.com/dashboard",
        [PageUrlType.PRICING]: "https://www.packycode.com/pricing"
      },
      site: PackySite.WWW
    }
  }

/**
 * API 配置管理器类
 * 提供统一的 API 配置访问接口
 *
 * @version v3.5.0 改为基于 PackySite
 */
export class ApiConfigManager {
  private readonly config: ApiEnvironmentConfig

  constructor(site: PackySite) {
    this.config = API_ENVIRONMENT_REGISTRY[site]
    if (!this.config) {
      throw new Error(`Unsupported site: ${site}`)
    }
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
   * 获取站点类型
   */
  getSite(): PackySite {
    return this.config.site
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
 *
 * @version v3.5.0 改为基于 PackySite
 */
export class ApiConfigManagerController {
  private cachedConfigManager: ApiConfigManager | null = null
  private cachedSite: null | PackySite = null

  /**
   * 获取当前站点的API URL (类型安全版本)
   */
  async getCurrentApiUrl(endpoint: ApiEndpointType): Promise<string> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.getApiUrl(endpoint)
  }

  /**
   * 获取当前站点的基础URL
   */
  async getCurrentBaseUrl(): Promise<string> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.getBaseUrl()
  }

  /**
   * 获取当前 API 配置管理器
   * 自动从存储读取当前激活账号的站点
   */
  async getCurrentConfigManager(): Promise<ApiConfigManager> {
    const currentSite = await this.getCurrentSite()

    // 如果站点没有变化，返回缓存的管理器
    if (this.cachedConfigManager && this.cachedSite === currentSite) {
      return this.cachedConfigManager
    }

    // 创建新的管理器并缓存
    this.cachedConfigManager = new ApiConfigManager(currentSite)
    this.cachedSite = currentSite

    return this.cachedConfigManager
  }

  /**
   * 获取当前站点的Cookie域名
   */
  async getCurrentCookieDomain(): Promise<string> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.getCookieDomain()
  }

  /**
   * 获取当前站点的页面URL (类型安全版本)
   */
  async getCurrentPageUrl(page: PageUrlType): Promise<string> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.getPageUrl(page)
  }

  /**
   * 检查URL是否属于当前站点
   */
  async isUrlBelongsToCurrentAccount(url: string): Promise<boolean> {
    const adapter = await this.getCurrentConfigManager()
    return adapter.isUrlBelongsToEnvironment(url)
  }

  /**
   * 强制刷新适配器缓存
   * 在用户切换账号后调用
   */
  async refreshConfigManager(): Promise<ApiConfigManager> {
    this.cachedConfigManager = null
    this.cachedSite = null
    return this.getCurrentConfigManager()
  }

  /**
   * 获取当前激活账号的站点 (v3.5.0+ 重构)
   *
   * 从当前激活账号读取 site 字段
   */
  private async getCurrentSite(): Promise<PackySite> {
    try {
      const { AccountManager } = await import("~/lib/account")
      const { getMultiAccountStorageManager } = await import("~/lib/storage")

      const storageManager = getMultiAccountStorageManager()
      const accountManager = new AccountManager(storageManager)
      const currentAccount = await accountManager.getCurrentAccount()

      // 默认使用主站（公交车模式）
      return currentAccount?.site ?? PackySite.WWW
    } catch {
      // 出错时默认使用主站
      return PackySite.WWW
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
