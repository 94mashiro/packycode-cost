import { Storage } from "@plasmohq/storage"

import type { PackyConfig } from "../types"

import { packyApi } from "../api"
import {
  checkPurchaseNotification,
  getPurchaseState,
  setPurchaseState
} from "./notificationStates"

const storage = new Storage()

// 全局锁，防止并发调用
let isCheckingPurchaseStatus = false

export { type PackyConfig }

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
    const result = await packyApi.getConfig()

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

    // 2. 检查购买状态变化并决定是否通知
    // 职责分离：先获取，再判断，最后更新
    const previousPurchaseState = await getPurchaseState()
    const shouldNotify = checkPurchaseNotification(
      previousPurchaseState,
      currentConfig.purchaseDisabled
    )

    console.log(
      `[STATUS] Previous: ${previousPurchaseState}, Current: ${currentConfig.purchaseDisabled}, Should notify: ${shouldNotify}`
    )

    // 3. 触发通知（只在从禁用变为可用时）
    let notificationTriggered = false
    if (shouldNotify) {
      console.log("[NOTIFICATION] Purchase status changed: disabled → enabled")
      await triggerPurchaseAvailableNotification()
      notificationTriggered = true
    }

    // 4. 更新存储状态 - 单一职责
    await setPurchaseState(currentConfig.purchaseDisabled)
    await storage.set("purchase_config", currentConfig)

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
    return await storage.get<PackyConfig>("purchase_config")
  } catch (error) {
    console.error("Failed to get current purchase config:", error)
    return null
  }
}

/**
 * 验证 PackyConfig 响应结构
 */
function isValidPackyConfig(config: unknown): config is PackyConfig {
  if (!config || typeof config !== "object") {
    return false
  }

  const c = config as Record<string, unknown>
  return (
    typeof c.purchaseDisabled === "boolean" &&
    typeof c.anthropicBaseUrl === "string" &&
    typeof c.purchaseUrl === "string" &&
    typeof c.supportEmail === "string"
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
