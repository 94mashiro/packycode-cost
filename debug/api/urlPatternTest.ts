/**
 * API Keys Pattern URL 验证工具
 */

import { dynamicApiUrls } from "~/api/dynamic"
import { loggers } from "~/lib/logger"
import { getCurrentAccountAdapter } from "~/modules/auth"

const logger = loggers.debug

/**
 * 浏览器控制台测试接口
 */
export function testApiKeysPattern() {
  logger.info("🚀 运行API Keys Pattern验证...")

  validateApiKeysPattern()
    .then((result) => {
      if (result.success) {
        logger.info(`🎉 验证通过: ${result.message}`)
      } else {
        logger.warn(`⚠️ 验证失败: ${result.message}`)
        logger.info("详细信息:", result.details)
      }
    })
    .catch((error) => {
      logger.error("💥 验证执行失败:", error)
    })
}

/**
 * 验证API Keys Pattern URL格式
 */
export async function validateApiKeysPattern(): Promise<{
  details: Record<string, unknown>
  message: string
  success: boolean
}> {
  logger.info("🔍 验证API Keys Pattern URL格式...")

  try {
    const adapter = await getCurrentAccountAdapter()
    const accountType = adapter.getAccountType()
    const baseUrl = adapter.getBaseUrl()

    // 获取API Keys Pattern
    const apiKeysPattern = await dynamicApiUrls.getApiKeysPattern()

    // 预期的格式
    const expectedPattern = `${baseUrl}/api/backend/users/*/api-keys/*`

    const details = {
      accountType,
      apiKeysPattern,
      baseUrl,
      expectedPattern,
      hasDoubleBaseUrl: apiKeysPattern.includes(baseUrl + baseUrl),
      isCorrectFormat: apiKeysPattern === expectedPattern
    }

    logger.info(`账号类型: ${accountType}`)
    logger.info(`基础URL: ${baseUrl}`)
    logger.info(`实际Pattern: ${apiKeysPattern}`)
    logger.info(`预期Pattern: ${expectedPattern}`)

    if (apiKeysPattern === expectedPattern) {
      logger.info("✅ API Keys Pattern URL格式正确")
      return {
        details,
        message: "API Keys Pattern URL格式正确",
        success: true
      }
    } else if (details.hasDoubleBaseUrl) {
      logger.info("❌ 检测到重复的基础URL")
      return {
        details,
        message: "API Keys Pattern URL格式错误：重复了基础URL",
        success: false
      }
    } else {
      logger.info("❌ API Keys Pattern URL格式不符合预期")
      return {
        details,
        message: "API Keys Pattern URL格式不符合预期",
        success: false
      }
    }
  } catch (error) {
    logger.error("❌ 验证失败:", error)
    return {
      details: { error: String(error) },
      message: `验证失败: ${error instanceof Error ? error.message : String(error)}`,
      success: false
    }
  }
}

// 如果在浏览器环境中，将测试函数添加到全局对象
if (typeof window !== "undefined") {
  ;(
    window as typeof window & { testApiKeysPattern: typeof testApiKeysPattern }
  ).testApiKeysPattern = testApiKeysPattern
  logger.info(
    "💡 提示: 在浏览器控制台中运行 testApiKeysPattern() 来验证URL格式"
  )
}
