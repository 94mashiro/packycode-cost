import { Storage } from "@plasmohq/storage"

import type {
  ApiKeyResponse,
  AuthStorage,
  TokenType,
  UserInfoStorage
} from "./types"

import { API_URLS } from "./api"
import { parseJWT } from "./utils/jwt"
import { loggers } from "./utils/logger"
import { checkAndNotifyPurchaseStatus } from "./utils/purchaseStatus"
import { STORAGE_KEYS } from "./utils/storage-keys"
import { fetchUserInfo } from "./utils/userInfo"

const storage = new Storage()
const logger = loggers.background

async function backgroundCheckPurchaseStatus() {
  // 使用统一的购买状态检查方法，包含锁机制和通知逻辑
  const result = await checkAndNotifyPurchaseStatus()

  if (result.success) {
    logger.info("Purchase status check completed successfully")
    if (result.triggered) {
      logger.info("Purchase notification was triggered")
    }
  } else {
    logger.debug("Purchase status check failed or was skipped")
  }
}

async function backgroundFetchUserInfo() {
  try {
    await fetchUserInfo()
  } catch (error) {
    logger.error("Background fetch failed:", error)
  }
}

async function updateBadge() {
  try {
    const userInfo = await storage.get<UserInfoStorage>(STORAGE_KEYS.USER_INFO)

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
      const authData = await storage.get<AuthStorage>(STORAGE_KEYS.AUTH)

      logger.debug("Current state:", {
        hasToken: !!authData?.token,
        shouldFetchCookie: !authData?.token || authData?.type !== "api_key",
        tokenType: authData?.type
      })

      // 仅在没有token或token类型为jwt时，才尝试从cookie获取
      if (!authData?.token || authData?.type !== "api_key") {
        const tokenCookie = await chrome.cookies.get({
          name: "token",
          url: API_URLS.PACKY_BASE
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
          await storage.set(STORAGE_KEYS.AUTH, authData)
          logger.info("Token stored successfully")
        }
      }
    } catch (error) {
      logger.error("Error getting cookie:", error)
    }
  }
})

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.action === "getStoredToken") {
    storage.get<AuthStorage>(STORAGE_KEYS.AUTH).then((authData) => {
      logger.debug("Retrieved auth data:", authData)
      sendResponse({
        expiry: authData?.expiry || null,
        token: authData?.token || null,
        tokenType: authData?.type || null
      })
    })
    return true // 表示异步响应
  }

  return false
})

chrome.storage.onChanged.addListener((changes) => {
  // 监听新的用户信息字段
  if (changes[STORAGE_KEYS.USER_INFO]) {
    updateBadge()
  }
})

function startPeriodicRefresh() {
  chrome.alarms.create("refreshUserInfo", {
    delayInMinutes: 0.5, // 30秒后首次执行
    periodInMinutes: 0.5 // 每30秒重复执行
  })
}

function startPurchaseStatusCheck() {
  logger.debug("Starting purchase status check alarm")
  chrome.alarms.create("checkPurchaseStatus", {
    delayInMinutes: 0.5, // 30秒后首次执行
    periodInMinutes: 0.5 // 每30秒重复执行
  })
}

function stopPeriodicRefresh() {
  chrome.alarms.clear("refreshUserInfo")
}

function stopPurchaseStatusCheck() {
  chrome.alarms.clear("checkPurchaseStatus")
}

chrome.alarms.onAlarm.addListener((alarm) => {
  logger.debug("Alarm triggered:", alarm.name, "at", new Date().toISOString())
  if (alarm.name === "refreshUserInfo") {
    backgroundFetchUserInfo()
  } else if (alarm.name === "checkPurchaseStatus") {
    backgroundCheckPurchaseStatus()
  }
})

chrome.runtime.onSuspend.addListener(() => {
  stopPeriodicRefresh()
  stopPurchaseStatusCheck()
})

chrome.runtime.onStartup.addListener(() => {
  startPeriodicRefresh()
  startPurchaseStatusCheck()
})

chrome.runtime.onInstalled.addListener(() => {
  startPeriodicRefresh()
  startPurchaseStatusCheck()
})

// 监听 API keys 相关请求的响应
chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.statusCode === 200 && details.method === "GET") {
      try {
        // 获取当前token用于重放请求
        const authData = await storage.get<AuthStorage>(STORAGE_KEYS.AUTH)
        if (!authData?.token) return

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
            await storage.set(STORAGE_KEYS.AUTH, newAuthData)

            logger.info("API key stored successfully")
            // 触发重新获取用户信息以更新额度显示
            backgroundFetchUserInfo()
          }
        }
      } catch (error) {
        logger.error("Failed to fetch API key:", error)
      }
    }
  },
  {
    urls: [API_URLS.API_KEYS_PATTERN]
  }
)

// 监听通知点击事件
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("purchase-available-")) {
    // 打开购买页面
    chrome.tabs.create({ url: API_URLS.PACKY_PRICING })
    // 清除通知
    chrome.notifications.clear(notificationId)
  }
})

updateBadge()
startPeriodicRefresh()
startPurchaseStatusCheck()
