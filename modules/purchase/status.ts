import type { CapabilitiesDomain, PackyConfig } from "~/types"

import { api } from "~/lib/api/PackyCodeApiClient"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import {
  checkPurchaseNotificationPermission,
  triggerPurchaseAvailableNotification
} from "~/services/notifications"

const logger = loggers.purchase

/**
 * 统一的购买状态检查方法（支持多账号并发）
 * 1. 获取最新API数据
 * 2. 比较与上次状态的差异
 * 3. 触发通知（如果从禁用变为可用）
 * 4. 更新存储状态
 * @param context 账号执行上下文
 */
export async function checkAndNotifyPurchaseStatus(
  context: import("~/types").AccountContext
): Promise<{
  purchaseDisabled: boolean
  success: boolean
  triggered: boolean
}> {
  try {
    // 直接从 context 解构所需信息
    const { accountId, site } = context

    // 1. 获取最新的API数据（使用账号的站点，确保站点和 token 匹配）
    logger.debug(
      `[API] Fetching purchase config for ${site} (account: ${accountId})`
    )
    const currentConfig = await api.getConfig(site)

    // 验证响应数据结构
    if (!isValidPackyConfig(currentConfig)) {
      logger.debug("[API] Invalid response structure")
      return { purchaseDisabled: true, success: false, triggered: false }
    }

    // 2. 检查购买状态变化并决定是否通知
    const storageManager = getStorageManager()
    const capabilities = await storageManager.get<CapabilitiesDomain>(
      accountId,
      StorageDomain.CAPABILITIES
    )
    const previousPurchaseState = capabilities?.purchaseDisabled
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
      // 检查用户是否开启了购买通知（站点级控制）
      const notificationEnabled =
        await checkPurchaseNotificationPermission(site)

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

    // 4. 更新存储状态（多账号安全：Chrome Storage 原子性保证）
    await storageManager.set(accountId, StorageDomain.CAPABILITIES, {
      ...capabilities,
      purchaseDisabled: currentConfig.purchaseDisabled
    })

    logger.debug("[STORAGE] Purchase status updated in storage")

    return {
      purchaseDisabled: currentConfig.purchaseDisabled,
      success: true,
      triggered: notificationTriggered
    }
  } catch (error) {
    logger.error("[ERROR] Purchase status check failed:", error)
    return { purchaseDisabled: true, success: false, triggered: false }
  }
}

/**
 * 获取当前购买状态（供UI组件使用）
 */
export async function getCurrentPurchaseDisabled(): Promise<boolean> {
  try {
    const { getActiveAccountData } = await import(
      "~/lib/storage/activeAccountHelpers"
    )
    const capabilities = await getActiveAccountData<CapabilitiesDomain>(
      StorageDomain.CAPABILITIES
    )
    return capabilities?.purchaseDisabled ?? true
  } catch (error) {
    logger.error("Failed to get current purchase disabled:", error)
    return true
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
