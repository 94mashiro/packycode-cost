import { Storage } from "@plasmohq/storage"

import { get } from "./request"

const storage = new Storage()

// 全局锁，防止并发调用
let isCheckingPurchaseStatus = false

export interface PackyConfig {
  anthropicBaseUrl: string
  purchaseDisabled: boolean
  purchaseUrl: string
  supportEmail: string
}

/**
 * 统一的购买状态检查方法
 * 1. 获取最新API数据
 * 2. 比较与上次状态的差异
 * 3. 触发通知（如果从禁用变为可用）
 * 4. 更新存储状态
 * 5. 释放锁
 */
export async function checkAndNotifyPurchaseStatus(): Promise<{
  config?: PackyConfig
  success: boolean
  triggered: boolean
}> {
  // 检查锁，防止并发调用
  if (isCheckingPurchaseStatus) {
    console.log("[LOCK] Purchase status check already in progress, skipping")
    return { success: false, triggered: false }
  }

  // 获取锁
  isCheckingPurchaseStatus = true
  console.log("[LOCK] Acquired purchase status check lock")

  try {
    // 1. 获取最新的API数据
    console.log("[API] Fetching latest purchase status")
    const result = await get<PackyConfig>(
      "https://www.packycode.com/api/config"
    )

    if (!result.success || !result.data) {
      console.log("[API] Failed to fetch current config:", result.error)
      return { success: false, triggered: false }
    }

    const currentConfig = result.data

    // 验证响应数据结构
    if (!isValidPackyConfig(currentConfig)) {
      console.log("[API] Invalid response structure")
      return { success: false, triggered: false }
    }

    // 2. 获取上次存储的购买禁用状态
    const lastPurchaseDisabled = await storage.get<boolean>(
      "last_purchase_disabled"
    )
    const currentPurchaseDisabled = currentConfig.purchaseDisabled

    console.log(
      `[STATUS] Previous: ${lastPurchaseDisabled}, Current: ${currentPurchaseDisabled}`
    )

    // 3. 检查是否需要触发通知（从禁用变为可用）
    let notificationTriggered = false
    if (lastPurchaseDisabled === true && currentPurchaseDisabled === false) {
      console.log("[NOTIFICATION] Purchase status changed: disabled → enabled")
      await triggerPurchaseAvailableNotification()
      notificationTriggered = true
    } else if (lastPurchaseDisabled !== undefined) {
      console.log("[STATUS] No notification needed")
    } else {
      console.log("[STATUS] First check, no notification")
    }

    // 4. 更新存储状态
    await storage.set("last_purchase_disabled", currentPurchaseDisabled)
    await storage.set("packy_config", currentConfig)
    await storage.set("packy_config_timestamp", Date.now())

    console.log("[STORAGE] Purchase status updated in storage")

    return {
      config: currentConfig,
      success: true,
      triggered: notificationTriggered
    }
  } catch (error) {
    console.error("[ERROR] Purchase status check failed:", error)
    return { success: false, triggered: false }
  } finally {
    // 5. 释放锁
    isCheckingPurchaseStatus = false
    console.log("[LOCK] Released purchase status check lock")
  }
}

/**
 * 兼容性方法：获取当前配置（供UI组件使用）
 */
export async function getCurrentPurchaseConfig(): Promise<null | PackyConfig> {
  try {
    return await storage.get<PackyConfig>("packy_config")
  } catch (error) {
    console.error("Failed to get current purchase config:", error)
    return null
  }
}

/**
 * 验证 PackyConfig 响应结构
 */
function isValidPackyConfig(config: any): config is PackyConfig {
  return (
    config &&
    typeof config === "object" &&
    typeof config.purchaseDisabled === "boolean" &&
    typeof config.anthropicBaseUrl === "string" &&
    typeof config.purchaseUrl === "string" &&
    typeof config.supportEmail === "string"
  )
}

/**
 * 触发购买可用通知
 */
async function triggerPurchaseAvailableNotification(): Promise<void> {
  const notificationId = `purchase-available-${Date.now()}`

  try {
    chrome.notifications.create(
      notificationId,
      {
        iconUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
        message: "购买功能现已开放，快冲！",
        title: "PackyCode 购买开放",
        type: "basic"
      },
      (createdNotificationId) => {
        if (chrome.runtime.lastError) {
          console.error(
            "[NOTIFICATION] Creation failed:",
            chrome.runtime.lastError
          )
        } else {
          console.log(
            "[NOTIFICATION] Created successfully:",
            createdNotificationId
          )
        }
      }
    )
  } catch (error) {
    console.error("[NOTIFICATION] Error creating notification:", error)
  }
}
