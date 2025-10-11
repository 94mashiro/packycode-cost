/**
 * 跨浏览器兼容性辅助模块
 *
 * 提供统一的浏览器 API 接口，兼容 Chrome 和 Firefox
 *
 * @author Linus & Dan's Design Philosophy
 */

import browser from "webextension-polyfill"

/**
 * 创建通知
 */
export async function createNotification(
  options: browser.Notifications.CreateNotificationOptions
): Promise<string> {
  const notificationId = `notification-${Date.now()}`
  return await browser.notifications.create(notificationId, options)
}

/**
 * 检测当前运行环境
 */
export function getBrowserInfo(): {
  isChrome: boolean
  isFirefox: boolean
  name: string
} {
  const userAgent = navigator.userAgent.toLowerCase()
  const isFirefox = userAgent.includes("firefox")
  const isChrome = userAgent.includes("chrome") && !isFirefox

  return {
    isChrome,
    isFirefox,
    name: isFirefox ? "Firefox" : isChrome ? "Chrome" : "Unknown"
  }
}

/**
 * 在新标签页中打开 URL
 */
export async function openTab(url: string): Promise<void> {
  await browser.tabs.create({ url })
}

// 导出 browser 对象供高级使用
export { browser }
