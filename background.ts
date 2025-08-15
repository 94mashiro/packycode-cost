import { Storage } from "@plasmohq/storage"

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
    // 清除错误计数器
    await storage.remove("purchase_check_error_count")
  } else {
    console.log("[BACKGROUND] Purchase status check failed or was skipped")

    // 记录连续错误次数
    const errorCount =
      (await storage.get<number>("purchase_check_error_count")) || 0
    const newErrorCount = errorCount + 1
    await storage.set("purchase_check_error_count", newErrorCount)

    // 如果连续失败3次，暂时停止轮询
    if (newErrorCount >= 3) {
      console.log(
        "[BACKGROUND] Too many failures, temporarily stopping purchase status checks"
      )
      chrome.alarms.clear("checkPurchaseStatus")

      // 5分钟后重新启动
      setTimeout(
        () => {
          console.log(
            "[BACKGROUND] Restarting purchase status checks after error recovery"
          )
          startPurchaseStatusCheck()
          storage.remove("purchase_check_error_count")
        },
        5 * 60 * 1000
      )
    }
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
    const cachedUserInfo = await storage.get<UserInfo>("cached_user_info")

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
    try {
      // 先检查是否已有token
      const existingToken = await storage.get("packy_token")
      const tokenType = await storage.get("packy_token_type")

      // 仅在没有token或token类型为jwt时，才尝试从cookie获取
      if (!existingToken || tokenType !== "api_key") {
        const tokenCookie = await chrome.cookies.get({
          name: "token",
          url: "https://www.packycode.com"
        })

        if (tokenCookie && tokenCookie.value) {
          await storage.set("packy_token", tokenCookie.value)
          await storage.set("packy_token_type", "jwt")
          await storage.set("packy_token_timestamp", Date.now())
        }
      }
    } catch {}
  }
})

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request.action === "getStoredToken") {
    Promise.all([
      storage.get("packy_token"),
      storage.get("packy_token_timestamp"),
      storage.get("packy_token_type")
    ]).then(([token, timestamp, tokenType]) => {
      sendResponse({ timestamp, token, tokenType })
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
  if (changes.cached_user_info) {
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
        const currentToken = await storage.get("packy_token")
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
            await storage.set("packy_token", data.api_key)
            await storage.set("packy_token_type", "api_key")
            await storage.set("packy_token_timestamp", Date.now())

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
    urls: ["https://www.packycode.com/api/backend/users/*/api-keys/*"]
  }
)

// 监听通知点击事件
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("purchase-available-")) {
    // 打开购买页面
    chrome.tabs.create({ url: "https://www.packycode.com/pricing" })
    // 清除通知
    chrome.notifications.clear(notificationId)
  }
})

updateBadge()
startPeriodicRefresh()
startPurchaseStatusCheck()
