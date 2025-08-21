import { Storage } from "@plasmohq/storage"

import { clearNotificationStates } from "./notificationStates"

const storage = new Storage()

export async function clearPluginTokenOnly() {
  try {
    await storage.remove("packy_token")
    await storage.remove("packy_token_timestamp")
    await storage.remove("packy_token_type")

    await storage.remove("cached_user_info")

    // 清理通知状态
    await clearNotificationStates()

    return true
  } catch {
    return false
  }
}
