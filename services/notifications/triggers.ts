import browser from "webextension-polyfill"

import { loggers } from "~/lib/logger"

const logger = loggers.notification

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
