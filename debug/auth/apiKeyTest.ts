/**
 * API Key 检测测试工具
 * 用于验证滴滴车模式下的API Key自动切换功能
 */

import { loggers } from "~/lib/logger"
import { getCurrentBaseUrl } from "~/modules/auth"

const logger = loggers.debug

/**
 * 检查当前webRequest监听器状态
 */
export async function checkWebRequestListenerStatus(): Promise<{
  details: Record<string, unknown>
  message: string
  success: boolean
}> {
  logger.info("🔍 检查webRequest监听器状态...")

  try {
    // 检查是否有权限
    const hasWebRequestPermission = chrome.webRequest !== undefined
    const hasHostPermissions = true // 我们已经配置了*.packycode.com/*权限

    const baseUrl = await getCurrentBaseUrl()
    const expectedPattern =
      "https://*.packycode.com/api/backend/users/*/api-keys/*"

    const details = {
      baseUrl,
      chromeWebRequestAvailable: !!chrome.webRequest,
      expectedPattern,
      hasHostPermissions,
      hasWebRequestPermission,
      manifestPermissions: {
        hostPermissions: hasHostPermissions,
        webRequest: hasWebRequestPermission
      }
    }

    if (hasWebRequestPermission && hasHostPermissions) {
      logger.info("✅ webRequest权限正常")
      logger.info(`当前基础URL: ${baseUrl}`)
      logger.info(`监听模式: ${expectedPattern}`)

      return {
        details,
        message: "webRequest监听器权限正常，应该能够监听API Key请求",
        success: true
      }
    } else {
      logger.info("❌ webRequest权限不足")

      return {
        details,
        message: "webRequest权限不足，无法监听API Key请求",
        success: false
      }
    }
  } catch (error) {
    logger.error("❌ webRequest状态检查失败:", error)
    return {
      details: { error: String(error) },
      message: `webRequest状态检查失败: ${error instanceof Error ? error.message : String(error)}`,
      success: false
    }
  }
}

/**
 * 调试API Key转换过程
 */
export function debugApiKeyConversion() {
  logger.info(`
🔧 API Key转换调试指南:

1. 检查webRequest监听器:
   - 打开Chrome扩展管理页面
   - 点击"检查视图: 服务工作进程"
   - 查看是否有"🔗 设置智能API Key监听器"日志

2. 监控API Key请求:
   - 打开浏览器开发者工具
   - 转到Network标签页  
   - 过滤URL包含"api-keys"的请求
   - 发起API Key生成请求

3. 验证监听器触发:
   - 在服务工作进程控制台查看"🔑 检测到API Key请求"日志
   - 确认URL匹配和响应处理

4. 检查存储更新:
   - 使用扩展的权限测试工具
   - 验证token类型是否变为"api_key"

如果仍有问题，请提供:
- 服务工作进程的完整日志
- 实际的API Key请求URL
- Network标签页的请求详情
`)
}

/**
 * 模拟API Key请求检测
 */
export async function testApiKeyDetection(
  userId: string,
  apiKeyId: string
): Promise<{
  details: Record<string, unknown>
  message: string
  success: boolean
}> {
  logger.info("🔑 开始测试API Key检测功能...")

  try {
    const baseUrl = await getCurrentBaseUrl()
    const testUrl = `${baseUrl}/api/backend/users/${userId}/api-keys/${apiKeyId}`

    logger.info(`测试URL: ${testUrl}`)
    logger.info(`当前基础域名: ${baseUrl}`)

    // 检查URL模式是否匹配
    const isApiKeyUrl =
      testUrl.includes("/api/backend/users/") && testUrl.includes("/api-keys/")

    const urlPattern = "https://*.packycode.com/api/backend/users/*/api-keys/*"
    const urlObj = new URL(testUrl)
    const isPatternMatch =
      urlObj.hostname.endsWith(".packycode.com") &&
      urlObj.pathname.match(/^\/api\/backend\/users\/[^/]+\/api-keys\/[^/]+$/)

    const details = {
      apiKeyId,
      baseUrl,
      hostname: urlObj.hostname,
      isApiKeyUrl,
      isPatternMatch,
      pathname: urlObj.pathname,
      testUrl,
      urlPattern,
      userId
    }

    if (isApiKeyUrl && isPatternMatch) {
      logger.info("✅ URL模式匹配正确")
      logger.info(`主机名: ${urlObj.hostname}`)
      logger.info(`路径: ${urlObj.pathname}`)

      return {
        details,
        message: "API Key URL模式检测正常，webRequest监听器应该能够捕获此请求",
        success: true
      }
    } else {
      logger.info("❌ URL模式匹配失败")
      logger.info(`API Key URL检查: ${isApiKeyUrl}`)
      logger.info(`通配符模式匹配: ${isPatternMatch}`)

      return {
        details,
        message: "API Key URL模式不匹配，监听器无法捕获此请求",
        success: false
      }
    }
  } catch (error) {
    logger.error("❌ API Key检测测试失败:", error)
    return {
      details: { error: String(error) },
      message: `API Key检测测试失败: ${error instanceof Error ? error.message : String(error)}`,
      success: false
    }
  }
}

/**
 * 完整的API Key监听测试
 */
export async function testApiKeyListening(): Promise<{
  message: string
  results: {
    listenerStatus: Awaited<ReturnType<typeof checkWebRequestListenerStatus>>
    urlDetection: Awaited<ReturnType<typeof testApiKeyDetection>>
  }
  success: boolean
}> {
  logger.info("🧪 开始完整API Key监听测试...")

  // 使用您提供的实际URL进行测试
  const testUserId = "5055db1c-8e75-44e0-82aa-82bb12107bc2"
  const testApiKeyId = "fad20599-2147-4474-b3df-4151169706c6"

  const listenerResult = await checkWebRequestListenerStatus()
  const detectionResult = await testApiKeyDetection(testUserId, testApiKeyId)

  const allSuccess = listenerResult.success && detectionResult.success

  const summary = `
API Key监听测试结果:
- 监听器状态: ${listenerResult.success ? "✅" : "❌"} ${listenerResult.message}
- URL检测: ${detectionResult.success ? "✅" : "❌"} ${detectionResult.message}

${allSuccess ? "🎉 API Key监听功能应该正常工作" : "⚠️ 发现问题，需要检查配置"}
`

  logger.info(summary)

  return {
    message: allSuccess ? "API Key监听测试全部通过" : "API Key监听测试发现问题",
    results: {
      listenerStatus: listenerResult,
      urlDetection: detectionResult
    },
    success: allSuccess
  }
}

// 浏览器控制台测试接口
if (typeof window !== "undefined") {
  ;(window as Record<string, unknown> & typeof window).testApiKeyListening =
    testApiKeyListening
  ;(window as Record<string, unknown> & typeof window).debugApiKeyConversion =
    debugApiKeyConversion
  logger.info("💡 提示: 在浏览器控制台中运行以下命令:")
  logger.info("  - testApiKeyListening() 测试API Key监听功能")
  logger.info("  - debugApiKeyConversion() 查看调试指南")
}
