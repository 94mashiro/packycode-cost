import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { getCurrentCookieDomain, parseJWT } from "~/modules/auth"
import {
  type BackgroundAction,
  BackgroundActionEnum,
  executeAllTasks,
  executeTaskByAction,
  isBackgroundAction,
  isDataTaskAction
} from "~/modules/tasks"

import type { ApiKeyResponse, AuthStorage, TokenType, UserInfo } from "./types"

import { dynamicApiUrls } from "./api/dynamic"

const logger = loggers.background

// 立即发送测试日志
;(() => {
  logger.info("🚀 Background Service Worker 启动")
  logger.debug("📡 日志桥梁已初始化")
})()

// 延迟测试日志
setTimeout(() => {
  logger.info("⏰ 延迟日志测试: Service Worker 运行中")
  logger.warn("⚠️ 这是一条警告消息")
  logger.error("❌ 这是一条错误消息（仅用于测试）")
}, 2000)

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
    const storageManager = await getStorageManager()
    const userInfo = await storageManager.get<UserInfo>(StorageDomain.USER_INFO)

    if (userInfo && userInfo.budgets.daily.limit > 0) {
      const percentage = Math.round(
        (userInfo.budgets.daily.spent / userInfo.budgets.daily.limit) * 100
      )

      chrome.action.setBadgeText({
        text: `${Math.min(percentage, 100)}%`
      })
    } else {
      chrome.action.setBadgeText({ text: "" })
    }
  } catch {
    chrome.action.setBadgeText({ text: "" })
  }
}

chrome.tabs.onUpdated.addListener(async (_, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url?.includes("packycode.com")) {
    logger.debug("Tab updated, checking token:", tab.url)
    try {
      // 先检查是否已有token
      const storageManager = await getStorageManager()
      const authData = await storageManager.get<AuthStorage>(StorageDomain.AUTH)

      logger.debug("Current state:", {
        hasToken: !!authData?.token,
        shouldFetchCookie: !authData?.token || authData?.type !== "api_key",
        tokenType: authData?.type
      })

      // 仅在没有token或token类型为jwt时，才尝试从cookie获取
      if (!authData?.token || authData?.type !== "api_key") {
        const cookieDomain = await getCurrentCookieDomain()
        const tokenCookie = await chrome.cookies.get({
          name: "token",
          url: cookieDomain
        })

        logger.debug("Cookie result:", {
          found: !!tokenCookie?.value,
          valueLength: tokenCookie?.value?.length || 0
        })

        if (tokenCookie && tokenCookie.value) {
          // 解析JWT获取过期时间
          const payload = parseJWT(tokenCookie.value)
          const authData: AuthStorage = {
            token: tokenCookie.value,
            type: "jwt" as TokenType,
            ...(payload?.exp && { expiry: payload.exp * 1000 }) // 转换为毫秒
          }
          await storageManager.set(StorageDomain.AUTH, authData)
          logger.info("Token stored successfully")
        }
      }
    } catch (error) {
      logger.error("Error getting cookie:", error)
    }
  }
})

chrome.runtime.onMessage.addListener(
  (request: { action: string }, _, sendResponse) => {
    // 类型安全的 action 验证
    if (!isBackgroundAction(request.action)) {
      sendResponse({
        error: `Invalid action: ${request.action}`,
        success: false
      })
      return false
    }

    const action = request.action as BackgroundAction

    if (action === BackgroundActionEnum.GET_STORED_TOKEN) {
      getStorageManager().then(async (storageManager) => {
        const authData = await storageManager.get<AuthStorage>(
          StorageDomain.AUTH
        )
        logger.debug("Retrieved auth data:", authData)
        sendResponse({
          expiry: authData?.expiry || null,
          token: authData?.token || null,
          tokenType: authData?.type || null
        })
      })
      return true // 表示异步响应
    }

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

    return false
  }
)

// 设置基于 Plasmo Storage 的存储监听
async function setupStorageListening() {
  try {
    const storageManager = await getStorageManager()

    // 监听用户信息变化，更新 badge
    storageManager.onDomainChange(StorageDomain.USER_INFO, () => {
      logger.debug("User info changed, updating badge")
      updateBadge()
    })

    logger.info("✅ Storage listening setup completed using Plasmo Storage API")
  } catch (error) {
    logger.error("❌ Failed to setup storage listening:", error)
  }
}

// 启动时初始化存储监听
setupStorageListening()

// 使用统一配置启动所有任务执行轮询
function startAllPeriodicTasks() {
  logger.info("🚀 启动所有周期性数据获取任务")
  chrome.alarms.create("executeAllTasks", {
    delayInMinutes: 0.5, // 30秒后首次执行
    periodInMinutes: 0.5 // 每30秒重复执行
  })
}

function stopAllPeriodicTasks() {
  logger.warn("⏹ 停止所有周期性任务")
  chrome.alarms.clear("executeAllTasks")
}

chrome.alarms.onAlarm.addListener((alarm) => {
  logger.debug("⏰ 定时器触发:", alarm.name, "时间:", new Date().toISOString())
  if (alarm.name === "executeAllTasks") {
    // 使用统一的任务执行机制，确保与手动触发行为一致
    backgroundExecuteAllTasks()
  }
})

chrome.runtime.onSuspend.addListener(() => {
  stopAllPeriodicTasks()
})

chrome.runtime.onStartup.addListener(() => {
  startAllPeriodicTasks()
})

chrome.runtime.onInstalled.addListener(() => {
  startAllPeriodicTasks()
})

// 全局监听器变量，用于管理webRequest监听器
let currentWebRequestListener:
  | ((details: chrome.webRequest.WebResponseDetails) => void)
  | null = null

// 设置动态webRequest监听器 - 根据当前账号类型监听对应的API
async function setupDynamicWebRequestListener() {
  try {
    // 清除现有监听器（如果有）
    if (currentWebRequestListener) {
      chrome.webRequest.onCompleted.removeListener(currentWebRequestListener)
      currentWebRequestListener = null
      logger.info("🧹 清除旧的webRequest监听器")
    }

    // 获取当前账号类型对应的API Keys Pattern
    const apiKeysPattern = await dynamicApiUrls.getApiKeysPattern()

    logger.info("🔗 设置webRequest监听器，模式:", apiKeysPattern)

    // 创建新的监听器函数
    currentWebRequestListener = async (details) => {
      if (details.statusCode === 200) {
        // 检查URL是否匹配API Key模式
        const isApiKeyRequest =
          details.url.includes("/api/backend/users/") &&
          details.url.includes("/api-keys/")

        if (!isApiKeyRequest) return

        logger.info("🔑 检测到API Key请求:", details.url)

        try {
          // 获取当前token用于重放请求
          const storageManager = await getStorageManager()
          const authData = await storageManager.get<AuthStorage>(
            StorageDomain.AUTH
          )
          if (!authData?.token) {
            logger.debug("⚠️ 没有token，跳过API Key处理")
            return
          }

          // 重放请求获取响应内容
          const response = await fetch(details.url, {
            headers: {
              Authorization: `Bearer ${authData.token}`,
              "Content-Type": "application/json"
            },
            method: "GET"
          })

          if (response.ok) {
            const data = (await response.json()) as ApiKeyResponse
            if (data.api_key) {
              // 存储API Key，覆盖现有token
              const newAuthData: AuthStorage = {
                token: data.api_key,
                type: "api_key" as TokenType
                // API Key 不需要过期时间
              }
              await storageManager.set(StorageDomain.AUTH, newAuthData)

              logger.info("✅ API key存储成功，来源:", details.url)
              // 触发重新获取用户信息以更新额度显示
              backgroundExecuteAllTasks()
            } else {
              logger.debug("⚠️ 响应中没有找到api_key字段")
            }
          } else {
            logger.warn(
              "⚠️ API Key请求重放失败:",
              response.status,
              response.statusText
            )
          }
        } catch (error) {
          logger.error("❌ 处理API Key请求失败:", error)
        }
      }
    }

    // 注册新的监听器
    chrome.webRequest.onCompleted.addListener(currentWebRequestListener, {
      urls: [apiKeysPattern]
    })

    logger.info("✅ 动态webRequest监听器设置完成")
  } catch (error) {
    logger.error("❌ 动态webRequest监听器设置失败:", error)
  }
}

// 监听用户偏好变化，动态更新webRequest监听器
async function setupUserPreferenceWatcher() {
  try {
    const storageManager = await getStorageManager()

    // 监听用户偏好变化
    storageManager.onDomainChange(StorageDomain.USER_PREFERENCE, async () => {
      logger.info("🔄 检测到用户偏好变化，重新设置webRequest监听器")

      // 延迟一点时间确保存储已完全更新
      setTimeout(() => {
        setupDynamicWebRequestListener()
      }, 500)
    })

    logger.info("✅ 用户偏好监听器设置完成")
  } catch (error) {
    logger.error("❌ 用户偏好监听器设置失败:", error)
  }
}

// 监听通知点击事件
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith("purchase-available-")) {
    // 打开购买页面
    const pricingUrl = await dynamicApiUrls.getPricingUrl()
    chrome.tabs.create({ url: pricingUrl })
    // 清除通知
    chrome.notifications.clear(notificationId)
  }
})

updateBadge()
startAllPeriodicTasks()
setupDynamicWebRequestListener()
setupUserPreferenceWatcher()
