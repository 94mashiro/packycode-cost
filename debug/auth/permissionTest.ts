/**
 * 权限验证工具
 * 用于测试扩展是否有访问不同域名的权限
 */

import { getCurrentBaseUrl, getCurrentCookieDomain } from "~/api/config"
import { loggers } from "~/lib/logger"

const logger = loggers.debug

/**
 * 浏览器控制台测试接口
 */
export function runPermissionTests() {
  logger.info("🚀 运行权限测试套件...")

  testAllPermissions()
    .then((result) => {
      if (result.success) {
        logger.info("🎉 所有权限测试通过!")
      } else {
        logger.warn("⚠️ 部分权限测试失败，请检查详细信息")
      }
    })
    .catch((error) => {
      logger.error("💥 权限测试套件执行失败:", error)
    })
}

/**
 * 测试所有权限
 */
export async function testAllPermissions(): Promise<{
  message: string
  results: {
    cookie: Awaited<ReturnType<typeof testCookiePermissions>>
    network: Awaited<ReturnType<typeof testNetworkPermissions>>
  }
  success: boolean
}> {
  logger.info("🧪 开始完整权限测试...")

  const cookieResult = await testCookiePermissions()
  const networkResult = await testNetworkPermissions()

  const allSuccess = cookieResult.success && networkResult.success

  const summary = `
权限测试结果:
- Cookie访问: ${cookieResult.success ? "✅" : "❌"} ${cookieResult.message}
- 网络请求: ${networkResult.success ? "✅" : "❌"} ${networkResult.message}
`

  logger.info(summary)

  return {
    message: allSuccess ? "所有权限测试通过" : "部分权限测试失败",
    results: {
      cookie: cookieResult,
      network: networkResult
    },
    success: allSuccess
  }
}

/**
 * 测试Cookie访问权限
 */
export async function testCookiePermissions(): Promise<{
  details: Record<string, unknown>
  message: string
  success: boolean
}> {
  logger.info("🔐 开始测试Cookie访问权限...")

  try {
    const cookieDomain = await getCurrentCookieDomain()
    const baseUrl = await getCurrentBaseUrl()

    logger.info(`当前Cookie域名: ${cookieDomain}`)
    logger.info(`当前基础URL: ${baseUrl}`)

    // 尝试获取token cookie
    const tokenCookie = await chrome.cookies.get({
      name: "token",
      url: cookieDomain
    })

    const details = {
      baseUrl,
      cookieDetails: tokenCookie,
      cookieDomain,
      tokenFound: !!tokenCookie?.value,
      tokenLength: tokenCookie?.value?.length || 0
    }

    if (tokenCookie?.value) {
      logger.info("✅ Cookie访问成功")
      logger.info(`Token长度: ${tokenCookie.value.length}`)
      return {
        details,
        message: "Cookie访问权限正常",
        success: true
      }
    } else {
      logger.info("⚠️ 未找到token cookie（可能用户未登录）")
      return {
        details,
        message: "Cookie访问权限正常，但未找到token（请先登录）",
        success: true
      }
    }
  } catch (error) {
    logger.error("❌ Cookie访问失败:", error)
    return {
      details: { error: String(error) },
      message: `Cookie访问权限错误: ${error instanceof Error ? error.message : String(error)}`,
      success: false
    }
  }
}

/**
 * 测试网络请求权限
 */
export async function testNetworkPermissions(): Promise<{
  details: Record<string, unknown>
  message: string
  success: boolean
}> {
  logger.info("🌐 开始测试网络请求权限...")

  try {
    const baseUrl = await getCurrentBaseUrl()
    const testUrl = `${baseUrl}/api/config`

    logger.info(`测试URL: ${testUrl}`)

    const response = await fetch(testUrl)
    const statusCode = response.status

    // 即使是401/403等认证错误，也说明网络权限是OK的
    const isNetworkPermissionOk = statusCode !== 0 && response.type !== "opaque"

    const details = {
      networkPermissionOk: isNetworkPermissionOk,
      statusCode,
      statusText: response.statusText,
      testUrl
    }

    if (isNetworkPermissionOk) {
      logger.info(`✅ 网络请求权限正常 (状态码: ${statusCode})`)
      return {
        details,
        message: `网络请求权限正常 (状态码: ${statusCode})`,
        success: true
      }
    } else {
      logger.info("❌ 网络请求权限被阻止")
      return {
        details,
        message: "网络请求权限被阻止",
        success: false
      }
    }
  } catch (error) {
    logger.error("❌ 网络请求测试失败:", error)

    // 检查是否是权限错误
    const isPermissionError =
      String(error).includes("permissions") ||
      String(error).includes("host_permissions") ||
      String(error).includes("CORS")

    return {
      details: {
        error: String(error),
        isPermissionError
      },
      message: isPermissionError
        ? "网络请求权限不足，请检查manifest.json的host_permissions配置"
        : `网络请求测试失败: ${error instanceof Error ? error.message : String(error)}`,
      success: false
    }
  }
}

// 如果在浏览器环境中，将测试函数添加到全局对象
if (typeof window !== "undefined") {
  ;(window as Record<string, unknown> & typeof window).testPermissions =
    runPermissionTests
  logger.info("💡 提示: 在浏览器控制台中运行 testPermissions() 来测试权限")
}
