import { Storage } from "@plasmohq/storage"

import { API_URLS } from "./api"
import { parseJWT } from "./utils/jwt"
import { checkAndNotifyPurchaseStatus } from "./utils/purchaseStatus"
import { fetchUserInfo, type UserInfo } from "./utils/userInfo"

const storage = new Storage()

async function backgroundCheckPurchaseStatus() {
  // 使用统一的购买状态检查方法，包含锁机制和通知逻辑
  const result = await checkAndNotifyPurchaseStatus()

  if (result.success) {
    console.log("[BACKGROUND] Purchase status check completed successfully")
    if (result.triggered) {
      console.log("[BACKGROUND] Purchase notification was triggered")
    }
  } else {
    console.log("[BACKGROUND] Purchase status check failed or was skipped")
  }
}

async function backgroundFetchUserInfo() {
  try {
    await fetchUserInfo()
  } catch (error) {
    console.error("Background fetch failed:", error)
  }
}

async function updateBadge() {
  try {
    const cachedUserInfo = await storage.get<UserInfo>("user_info")

    if (cachedUserInfo && cachedUserInfo.daily_budget_usd > 0) {
      const percentage = Math.round(
        (cachedUserInfo.daily_spent_usd / cachedUserInfo.daily_budget_usd) * 100
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
    console.log("[JWT] Tab updated, checking token:", tab.url)
    try {
      // 先检查是否已有token
      const existingToken = await storage.get<string>("token")
      const tokenType = await storage.get<string>("token_type")

      console.log("[JWT] Current state:", {
        hasToken: !!existingToken,
        shouldFetchCookie: !existingToken || tokenType !== "api_key",
        tokenType
      })

      // 仅在没有token或token类型为jwt时，才尝试从cookie获取
      if (!existingToken || tokenType !== "api_key") {
        const tokenCookie = await chrome.cookies.get({
          name: "token",
          url: API_URLS.PACKY_BASE
        })

        console.log("[JWT] Cookie result:", {
          found: !!tokenCookie?.value,
          valueLength: tokenCookie?.value?.length || 0
        })

        if (tokenCookie && tokenCookie.value) {
          await storage.set("token", tokenCookie.value)
          await storage.set("token_type", "jwt")
          // 解析JWT获取过期时间
          const payload = parseJWT(tokenCookie.value)
          if (payload?.exp) {
            await storage.set("token_expiry", payload.exp * 1000) // 转换为毫秒
          }
          console.log("[JWT] Token stored successfully")
        }
      }
    } catch (error) {
      console.error("[JWT] Error getting cookie:", error)
    }
  }
})

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.action === "getStoredToken") {
    Promise.all([
      storage.get<string>("token"),
      storage.get<number>("token_expiry"),
      storage.get<string>("token_type")
    ]).then(([token, expiry, tokenType]) => {
      sendResponse({ expiry, token, tokenType })
    })
    return true
  }

  if (request.action === "updateBadge") {
    updateBadge()
    sendResponse({ success: true })
    return true
  }

  if (request.action === "checkPurchaseStatus") {
    backgroundCheckPurchaseStatus()
    sendResponse({ success: true })
    return true
  }
})

chrome.storage.onChanged.addListener((changes) => {
  if (changes.user_info) {
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
  console.log("[ALARM] Starting purchase status check alarm")
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
  console.log(
    "[ALARM] Alarm triggered:",
    alarm.name,
    "at",
    new Date().toISOString()
  )
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
        const currentToken = await storage.get<string>("token")
        if (!currentToken) return

        // 重放请求获取响应内容
        const response = await fetch(details.url, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json"
          },
          method: "GET"
        })

        if (response.ok) {
          const data = await response.json()
          if (data.api_key) {
            // 存储API Key，覆盖现有token
            await storage.set("token", data.api_key)
            await storage.set("token_type", "api_key")
            // API Key 不需要过期时间
            await storage.remove("token_expiry")

            console.log("API key stored successfully")
            // 触发重新获取用户信息以更新额度显示
            backgroundFetchUserInfo()
          }
        }
      } catch (error) {
        console.error("Failed to fetch API key:", error)
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
