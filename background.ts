import { Storage } from "@plasmohq/storage"

import { fetchPurchaseStatus, type PackyConfig } from "./utils/purchaseStatus"
import { fetchUserInfo, type UserInfo } from "./utils/userInfo"

const storage = new Storage()

async function backgroundCheckPurchaseStatus() {
  try {
    console.log(
      "[ALARM] Purchase status check triggered at:",
      new Date().toISOString()
    )

    // 获取最新的API数据（静态导入，避免动态导入在 SW 中偶发失败）
    console.log("[ALARM] About to call fetchPurchaseStatus()")
    const currentConfig = await fetchPurchaseStatus()
    console.log(
      "[ALARM] fetchPurchaseStatus() returned:",
      currentConfig ? "success" : "null"
    )

    if (!currentConfig) {
      console.log("[ALARM] Failed to fetch current config, stopping")
      return
    }

    // 获取之前的配置，添加正确的类型
    const previousConfig = await storage.get<PackyConfig>(
      "packy_config_previous"
    )

    // 更新storage中的当前数据供UI组件使用
    await storage.set("packy_config", currentConfig)
    await storage.set("packy_config_timestamp", Date.now())

    // 检查是否首次检查
    if (!previousConfig) {
      console.log("First check, saving initial state")
      await storage.set("packy_config_previous", currentConfig)
      return
    }

    // 检查购买状态是否从禁用变为开放
    const statusChanged =
      previousConfig.purchaseDisabled && !currentConfig.purchaseDisabled

    console.log(
      `Alarm check: previous=${previousConfig.purchaseDisabled}, current=${currentConfig.purchaseDisabled}, changed=${statusChanged}`
    )

    if (statusChanged) {
      // 显示购买开放通知
      const notificationId = `purchase-available-${Date.now()}`
      console.log(
        "Purchase status changed! Creating notification with ID:",
        notificationId
      )

      try {
        chrome.notifications.create(
          notificationId,
          {
            iconUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            message: "购买功能现已开放，点击查看购买选项",
            title: "PackyCode 购买开放",
            type: "basic"
          },
          (createdNotificationId) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Notification creation failed:",
                chrome.runtime.lastError
              )
            } else {
              console.log(
                "Notification created successfully with ID:",
                createdNotificationId
              )
            }
          }
        )
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError)
      }

      console.log("PackyCode purchase is now available!")
    }

    // 最后更新previous状态，为下次比较做准备
    await storage.set("packy_config_previous", currentConfig)
  } catch (error) {
    console.error("Background purchase status check failed:", error)
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
