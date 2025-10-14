import browser from "webextension-polyfill"

import { loggers } from "~/lib/logger"
import { httpClient } from "~/lib/request/AuthenticatedClient"
import { getStorageManager } from "~/lib/storage"
import {
  getActiveAccountData,
  getActiveAccountId,
  setActiveAccountData
} from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"
import { parseJWT } from "~/modules/auth"
import { getBackgroundAccountService } from "~/modules/background"
import {
  type BackgroundAction,
  executeAllTasks,
  executeTaskByAction,
  isBackgroundAction,
  isDataTaskAction
} from "~/modules/tasks"
import { migrateNotificationPreferences } from "~/services/notifications"

import type { ApiKeyResponse, AuthStorage, TokenType, UserInfo } from "./types"

import { apiUrls } from "./api"
import { getCookieDomain } from "./api/config"
import { AccountManager } from "./lib/account/AccountManager"
import { PackySite } from "./types/account"

const logger = loggers.background

/**
 * 初始化多账号系统（v3.0.0+）
 *
 * 执行数据迁移和账号恢复
 * ⚠️ 此函数应在扩展启动时尽早调用
 */
async function initializeMultiAccountSystem() {
  try {
    logger.info("🚀 初始化多账号管理系统...")
    const accountService = getBackgroundAccountService()
    await accountService.initialize()
    logger.info("✅ 多账号管理系统初始化完成")

    await migrateNotificationPreferences()
  } catch (error) {
    logger.error("❌ 多账号管理系统初始化失败:", error)
  }
}

// 在所有其他初始化之前执行多账号系统初始化
initializeMultiAccountSystem()

// 使用统一的任务执行机制替代原来的独立函数
async function backgroundExecuteAllTasks() {
  const result = await executeAllTasks()

  if (result.success) {
    logger.info("✅ Background 数据获取任务执行成功")
  } else {
    const errors = result.results.filter((r) => !r.success)
    logger.warn(
      `⚠️ Background 数据获取任务完成，${errors.length} 个失败`,
      errors
    )
  }

  return result
}

async function updateBadge() {
  try {
    const userInfo = await getActiveAccountData<UserInfo>(StorageDomain.FINANCE)

    if (userInfo && userInfo.budgets.daily.limit > 0) {
      const percentage = Math.round(
        (userInfo.budgets.daily.spent / userInfo.budgets.daily.limit) * 100
      )

      await browser.action.setBadgeText({
        text: `${Math.min(percentage, 100)}%`
      })
    } else {
      await browser.action.setBadgeText({ text: "" })
    }
  } catch {
    await browser.action.setBadgeText({ text: "" })
  }
}

// ===== Cookie 自动检测已废弃 =====
// 多账号管理系统（v3.0.0+）要求用户主动添加账号
// 自动检测逻辑会导致数据结构不一致问题
// 已移除：browser.tabs.onUpdated 监听器

browser.runtime.onMessage.addListener(
  (
    request: { action: string },
    _: browser.Runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    // 类型安全的 action 验证
    if (!isBackgroundAction(request.action)) {
      sendResponse({
        error: `Invalid action: ${request.action}`,
        success: false
      })
      return
    }

    const action = request.action as BackgroundAction

    // GET_STORED_TOKEN 已废弃：直接使用 getActiveAccountData() 读取

    // 使用统一的任务执行机制处理所有数据获取任务 (类型安全)
    if (isDataTaskAction(action)) {
      executeTaskByAction(action)
        .then((result) => {
          sendResponse(result)
        })
        .catch((error) => {
          logger.error(`手动数据获取任务失败: ${action}`, error)
          sendResponse({ error: error.message, success: false })
        })
      return true // 表示异步响应
    }
  }
)

// 设置基于 Plasmo Storage 的存储监听
async function setupStorageListening() {
  try {
    const activeAccountId = await getActiveAccountId()

    if (!activeAccountId) {
      logger.warn("⚠️ No active account, skipping storage listening setup")
      return
    }

    const storageManager = getStorageManager()

    // 使用 MultiAccountStorageManager 的 watch API（需要显式传入 accountId）
    storageManager.watch(activeAccountId, {
      [StorageDomain.FINANCE]: () => {
        logger.debug("User info changed, updating badge")
        updateBadge()
      }
    })

    logger.info(
      `✅ Storage listening setup completed for account: ${activeAccountId}`
    )
  } catch (error) {
    logger.error("❌ Failed to setup storage listening:", error)
  }
}

// 启动时初始化存储监听
setupStorageListening()

// 使用统一配置启动所有任务执行轮询
function startAllPeriodicTasks() {
  logger.info("🚀 启动所有周期性数据获取任务")
  browser.alarms.create("executeAllTasks", {
    delayInMinutes: 0.5, // 30秒后首次执行
    periodInMinutes: 0.5 // 每30秒重复执行
  })
}

browser.alarms.onAlarm.addListener((alarm) => {
  logger.debug("⏰ 定时器触发:", alarm.name, "时间:", new Date().toISOString())
  if (alarm.name === "executeAllTasks") {
    // 使用统一的任务执行机制，确保与手动触发行为一致
    backgroundExecuteAllTasks()
  }
})

// Firefox 不支持 onSuspend 事件
// Service Worker 会自动在空闲时暂停，无需手动处理

browser.runtime.onStartup.addListener(() => {
  startAllPeriodicTasks()
})

browser.runtime.onInstalled.addListener(() => {
  startAllPeriodicTasks()
})

// ===== WebRequest API Key 自动检测已废弃 =====
// 多账号管理系统（v3.0.0+）要求用户主动添加账号
// 自动检测逻辑会导致数据结构不一致问题
// 已移除：
// - currentWebRequestListener 变量
// - setupDynamicWebRequestListener() 函数
// - setupUserPreferenceWatcher() 函数

// 监听通知点击事件
browser.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith("purchase-available-")) {
    // 获取当前账号站点
    const accountManager = new AccountManager(getStorageManager())
    const currentAccount = await accountManager.getCurrentAccount()
    const site = currentAccount?.site ?? PackySite.WWW

    // 打开购买页面
    const pricingUrl = apiUrls.getPricingUrl(site)
    await browser.tabs.create({ url: pricingUrl })
    // 清除通知
    await browser.notifications.clear(notificationId)
  }
})

updateBadge()
startAllPeriodicTasks()
// setupDynamicWebRequestListener() - 已废弃
// setupUserPreferenceWatcher() - 已废弃
