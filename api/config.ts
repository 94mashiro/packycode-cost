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
 * @version 3.0.0 - 改为基于 PackySite 而非 AccountVersion
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
 * @version 3.0.0 - 改为基于 PackySite 索引
 */
export const API_ENVIRONMENT_REGISTRY: Record<PackySite, ApiEnvironmentConfig> =
  {
    [PackySite.CODEX]: {
      baseUrl: "https://codex.packycode.com",
      cookieDomain: "https://codex.packycode.com",
      description: "Codex站 - Codex服务",
      endpoints: {
        [ApiEndpointType.API_KEYS_PATTERN]: "/api/backend/users/*/api-keys/*",
        [ApiEndpointType.CONFIG]: "/api/config",
        [ApiEndpointType.PEER_SPENDING_TODAY]:
          "/api/backend/accounts/peer-spending/today",
        [ApiEndpointType.SHARED_SPACE]:
          "/api/backend/accounts/my-assignments/usage",
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
      description: "拼车站 - 私有 API 环境",
      endpoints: {
        [ApiEndpointType.API_KEYS_PATTERN]: "/api/backend/users/*/api-keys/*",
        [ApiEndpointType.CONFIG]: "/api/config",
        [ApiEndpointType.PEER_SPENDING_TODAY]:
          "/api/backend/accounts/peer-spending/today",
        [ApiEndpointType.SHARED_SPACE]:
          "/api/backend/accounts/my-assignments/usage",
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
      description: "主站 - 共享 API 环境",
      endpoints: {
        [ApiEndpointType.API_KEYS_PATTERN]: "/api/backend/users/*/api-keys/*",
        [ApiEndpointType.CONFIG]: "/api/config",
        [ApiEndpointType.PEER_SPENDING_TODAY]:
          "/api/backend/accounts/peer-spending/today", // 不会使用，但需要定义
        [ApiEndpointType.SHARED_SPACE]:
          "/api/backend/accounts/my-assignments/usage",
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
 * @version 3.0.0 - 改为基于 PackySite
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
 * 显式参数版本的配置获取函数
 * 架构原则：底层工具必须明确要求所有依赖，不隐式查询全局状态
 *
 * 🐧 Linus: "显式优于隐式，全局状态是万恶之源"
 * ⚛️ Dan: "函数签名应该清楚表达所有依赖"
 * ☕ Bloch: "让错误用法难以发生"
 * 🏛️ Fowler: "UI层可以有'当前用户'，但底层工具不应该"
 */

/**
 * 获取指定站点的 API URL
 * @param site 目标站点
 * @param endpoint API端点类型
 */
export function getApiUrl(site: PackySite, endpoint: ApiEndpointType): string {
  const configManager = new ApiConfigManager(site)
  return configManager.getApiUrl(endpoint)
}

/**
 * 获取指定站点的基础 URL
 * @param site 目标站点
 */
export function getBaseUrl(site: PackySite): string {
  const configManager = new ApiConfigManager(site)
  return configManager.getBaseUrl()
}

/**
 * 获取指定站点的 Cookie 域名
 * @param site 目标站点
 */
export function getCookieDomain(site: PackySite): string {
  const configManager = new ApiConfigManager(site)
  return configManager.getCookieDomain()
}

/**
 * 获取指定站点的页面 URL
 * @param site 目标站点
 * @param page 页面类型
 */
export function getPageUrl(site: PackySite, page: PageUrlType): string {
  const configManager = new ApiConfigManager(site)
  return configManager.getPageUrl(page)
}

/**
 * 检查 URL 是否属于指定站点
 * @param site 目标站点
 * @param url 要检查的 URL
 */
export function isUrlBelongsToSite(site: PackySite, url: string): boolean {
  const configManager = new ApiConfigManager(site)
  return configManager.isUrlBelongsToEnvironment(url)
}
