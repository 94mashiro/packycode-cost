import type { PackyConfig, SystemPreferenceStorage } from "~/types"

import { api } from "~/lib/api/PackyCodeApiClient"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { checkPurchaseNotificationPermission } from "~/utils/notificationPermissions"

const logger = loggers.purchase

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
    logger.debug("[LOCK] Purchase status check already in progress, skipping")
    return { success: false, triggered: false }
  }

  // 获取锁
  isCheckingPurchaseStatus = true
  logger.debug("[LOCK] Acquired purchase status check lock")

  try {
    // 1. 获取最新的API数据
    logger.debug("[API] Fetching latest purchase status")
    const currentConfig = await api.getConfig()

    // 验证响应数据结构
    if (!isValidPackyConfig(currentConfig)) {
      logger.debug("[API] Invalid response structure")
      return { success: false, triggered: false }
    }

    // 2. 检查购买状态变化并决定是否通知
    const storageManager = await getStorageManager()
    const systemPref = await storageManager.get<SystemPreferenceStorage>(
      StorageDomain.SYSTEM_PREFERENCE
    )
    const previousPurchaseState = systemPref?.purchase_disabled
    const shouldNotify = checkPurchaseNotification(
      previousPurchaseState,
      currentConfig.purchaseDisabled
    )

    logger.debug(
      `[STATUS] Previous: ${previousPurchaseState}, Current: ${currentConfig.purchaseDisabled}, Should notify: ${shouldNotify}`
    )

    // 3. 触发通知（只在从禁用变为可用时，且用户开启了通知）
    let notificationTriggered = false
    if (shouldNotify) {
      // 检查用户是否开启了购买通知
      const notificationEnabled = await checkPurchaseNotificationPermission()

      if (notificationEnabled) {
        logger.debug(
          "[NOTIFICATION] Purchase status changed: disabled → enabled"
        )
        await triggerPurchaseAvailableNotification()
        notificationTriggered = true
      } else {
        logger.debug(
          "[NOTIFICATION] Purchase notification disabled by user settings, skipping"
        )
      }
    }

    // 4. 更新存储状态
    await storageManager.set(StorageDomain.SYSTEM_PREFERENCE, {
      purchase_disabled: currentConfig.purchaseDisabled
    })
    await storageManager.set(StorageDomain.PURCHASE_CONFIG, currentConfig, true)

    logger.debug("[STORAGE] Purchase status updated in storage")

    return {
      config: currentConfig,
      success: true,
      triggered: notificationTriggered
    }
  } catch (error) {
    logger.error("[ERROR] Purchase status check failed:", error)
    return { success: false, triggered: false }
  } finally {
    // 5. 释放锁
    isCheckingPurchaseStatus = false
    logger.debug("[LOCK] Released purchase status check lock")
  }
}

/**
 * 获取当前配置（供UI组件使用）
 */
export async function getCurrentPurchaseConfig(): Promise<null | PackyConfig> {
  try {
    const storageManager = await getStorageManager()
    return await storageManager.get<PackyConfig>(StorageDomain.PURCHASE_CONFIG)
  } catch (error) {
    logger.error("Failed to get current purchase config:", error)
    return null
  }
}

/**
 * 检查是否需要购买状态通知
 */
function checkPurchaseNotification(
  previousState: boolean | undefined,
  currentDisabled: boolean
): boolean {
  // 仅在状态从Disabled变为Enabled时通知
  return previousState === true && currentDisabled === false
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
          logger.error(
            "Purchase notification creation failed:",
            chrome.runtime.lastError
          )
        } else {
          logger.debug("Purchase notification created:", createdNotificationId)
        }
      }
    )
  } catch (error) {
    logger.error("Error creating purchase notification:", error)
  }
}
