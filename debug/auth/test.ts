/**
 * 账号类型适配层测试工具
 *
 * 用于验证私家车模式认证流程是否正常工作
 */

import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import {
  ACCOUNT_CONFIG_REGISTRY,
  accountAdapterManager,
  type AccountConfig,
  getCurrentAccountAdapter,
  getCurrentBaseUrl
} from "~/modules/auth"
import { AccountVersion, type UserPreferenceStorage } from "~/types"

const logger = loggers.debug

/**
 * 在浏览器控制台中运行测试的便捷函数
 */
export function runAccountAdapterTests() {
  logger.info("🚀 运行账号适配层测试套件...\n")

  // 验证配置
  const configValid = validateAccountConfigs()
  if (!configValid) {
    logger.error("❌ 配置验证失败，终止测试")
    return
  }

  // 运行功能测试
  testAccountTypeSwitching()
    .then((result) => {
      if (result.success) {
        logger.info(`\n🎉 所有测试完成: ${result.message}`)
      } else {
        logger.error(`\n💥 测试失败: ${result.message}`)
      }
    })
    .catch((error) => {
      logger.error("\n💥 测试套件执行失败:", error)
    })
}

/**
 * 测试账号类型切换功能
 */
export async function testAccountTypeSwitching() {
  logger.info("🧪 开始测试账号类型适配层...")

  try {
    // 1. 测试默认配置（应该是共享模式）
    logger.info("\n1. 测试默认配置...")
    const defaultAdapter = await getCurrentAccountAdapter()
    const defaultBaseUrl = await getCurrentBaseUrl()
    logger.info(`默认账号类型: ${defaultAdapter.getAccountType()}`)
    logger.info(`默认基础URL: ${defaultBaseUrl}`)

    // 2. 切换到私家车模式
    logger.info("\n2. 切换到私家车模式...")
    const storageManager = await getStorageManager()
    await storageManager.set(StorageDomain.USER_PREFERENCE, {
      account_version: AccountVersion.PRIVATE
    } as UserPreferenceStorage)

    // 刷新适配器缓存
    await accountAdapterManager.refreshAdapter()

    const privateAdapter = await getCurrentAccountAdapter()
    const privateBaseUrl = await getCurrentBaseUrl()
    logger.info(`私家车账号类型: ${privateAdapter.getAccountType()}`)
    logger.info(`私家车基础URL: ${privateBaseUrl}`)

    // 3. 验证URL配置
    logger.info("\n3. 验证URL配置...")
    const dashboardUrl = await privateAdapter.getPageUrl("dashboard")
    const configApiUrl = await privateAdapter.getApiUrl("config")
    logger.info(`仪表板URL: ${dashboardUrl}`)
    logger.info(`配置API URL: ${configApiUrl}`)

    // 4. 测试URL检测
    logger.info("\n4. 测试URL检测...")
    const isPrivateUrl = privateAdapter.isUrlBelongsToAccount(
      "https://share.packycode.com/dashboard"
    )
    const isSharedUrl = privateAdapter.isUrlBelongsToAccount(
      "https://www.packycode.com/dashboard"
    )
    logger.info(`share.packycode.com 属于私家车: ${isPrivateUrl}`)
    logger.info(`www.packycode.com 属于私家车: ${isSharedUrl}`)

    // 5. 切换回共享模式
    logger.info("\n5. 切换回共享模式...")
    await storageManager.set(StorageDomain.USER_PREFERENCE, {
      account_version: AccountVersion.SHARED
    } as UserPreferenceStorage)

    await accountAdapterManager.refreshAdapter()
    const sharedAdapter = await getCurrentAccountAdapter()
    const sharedBaseUrl = await getCurrentBaseUrl()
    logger.info(`共享账号类型: ${sharedAdapter.getAccountType()}`)
    logger.info(`共享基础URL: ${sharedBaseUrl}`)

    // 6. 验证配置完整性
    logger.info("\n6. 验证配置完整性...")
    const allAccountTypes = Object.values(AccountVersion)
    const allConfigs = Object.keys(ACCOUNT_CONFIG_REGISTRY)
    logger.info(`支持的账号类型: ${allAccountTypes.join(", ")}`)
    logger.info(`配置的账号类型: ${allConfigs.join(", ")}`)

    const missingConfigs = allAccountTypes.filter(
      (type) => !ACCOUNT_CONFIG_REGISTRY[type]
    )
    if (missingConfigs.length > 0) {
      logger.error(`❌ 缺少配置的账号类型: ${missingConfigs.join(", ")}`)
    } else {
      logger.info("✅ 所有账号类型都有对应配置")
    }

    logger.info("\n✅ 账号类型适配层测试完成！")

    return {
      message: "所有测试通过",
      success: true
    }
  } catch (error) {
    logger.error("❌ 测试失败:", error)
    return {
      message:
        error instanceof Error ? error.message : "测试过程中发生未知错误",
      success: false
    }
  }
}

/**
 * 验证配置结构完整性
 */
export function validateAccountConfigs(): boolean {
  logger.info("🔍 验证账号配置结构...")

  const allAccountTypes = Object.values(AccountVersion)
  const errors: string[] = []

  for (const accountType of allAccountTypes) {
    const config = ACCOUNT_CONFIG_REGISTRY[accountType]

    if (!config) {
      errors.push(`缺少 ${accountType} 的配置`)
      continue
    }

    // 验证必需字段
    const requiredFields: (keyof AccountConfig)[] = [
      "type",
      "baseUrl",
      "cookieDomain",
      "endpoints",
      "pages",
      "description"
    ]

    for (const field of requiredFields) {
      if (!config[field]) {
        errors.push(`${accountType} 缺少字段: ${String(field)}`)
      }
    }

    // 验证endpoints结构
    if (config.endpoints) {
      const requiredEndpoints = ["config", "userInfo", "apiKeysPattern"]
      for (const endpoint of requiredEndpoints) {
        if (!config.endpoints[endpoint as keyof typeof config.endpoints]) {
          errors.push(`${accountType} 缺少端点: ${endpoint}`)
        }
      }
    }

    // 验证pages结构
    if (config.pages) {
      const requiredPages = ["dashboard", "pricing"]
      for (const page of requiredPages) {
        if (!config.pages[page as keyof typeof config.pages]) {
          errors.push(`${accountType} 缺少页面: ${page}`)
        }
      }
    }

    // 验证URL格式
    try {
      new URL(config.baseUrl)
      new URL(config.cookieDomain)
    } catch {
      errors.push(`${accountType} URL格式无效`)
    }
  }

  if (errors.length > 0) {
    logger.error("❌ 配置验证失败:")
    errors.forEach((error) => logger.error(`  - ${error}`))
    return false
  }

  logger.info("✅ 账号配置结构验证通过")
  return true
}

// 如果在浏览器环境中，将测试函数添加到全局对象
if (typeof window !== "undefined") {
  ;(window as Record<string, unknown> & typeof window).testAccountAdapter =
    runAccountAdapterTests
  logger.info(
    "💡 提示: 在浏览器控制台中运行 testAccountAdapter() 来测试账号适配层"
  )
}
