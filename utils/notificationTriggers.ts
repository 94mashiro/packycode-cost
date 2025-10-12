/**
 * 通知触发器模块
 *
 * 统一管理所有通知的触发逻辑，供多个模块复用
 * Joshua Bloch: "消除代码重复，提取公共逻辑"
 * Martin Fowler: "单一职责原则 - 通知触发与业务逻辑分离"
 */

import browser from "webextension-polyfill"

import { loggers } from "~/lib/logger"

const logger = loggers.notification

/**
 * 触发购买功能可用通知
 * 当 purchaseDisabled 从 true 变为 false 时调用
 */
export async function triggerPurchaseAvailableNotification(): Promise<void> {
  const notificationId = `purchase-available-${Date.now()}`

  try {
    await browser.notifications.create(notificationId, {
      iconUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
      message: "购买功能现已开放，快冲！",
      title: "PackyCode 购买开放",
      type: "basic"
    })
    logger.debug("Purchase notification created:", notificationId)
  } catch (error) {
    logger.error("Error creating purchase notification:", error)
  }
}

/**
 * 触发 Opus 模型状态变化通知
 * 当 opus_enabled 状态发生变化时调用
 *
 * @param enabled 当前 Opus 状态（true=已开启，false=已关闭）
 */
export async function triggerOpusStatusNotification(
  enabled: boolean
): Promise<void> {
  const notificationId = `opus-status-${Date.now()}`

  try {
    await browser.notifications.create(notificationId, {
      iconUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAMCAIAAADkharWAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAEXRFWHRTb2Z0d2FyZQBTbmlwYXN0ZV0Xzt0AAAAXSURBVCiRY7xZHs5ACmAiSfWohhGkAQDm0QG/dWCPgQAAAABJRU5ErkJggg==",
      message: enabled ? "Claude Opus 模型已开启！" : "Claude Opus 模型已关闭",
      title: "PackyCode Opus 状态",
      type: "basic"
    })
    logger.debug(
      "Opus status notification created successfully:",
      notificationId
    )
  } catch (error) {
    logger.error("Error creating opus status notification:", error)
  }
}
