import { Storage } from "@plasmohq/storage"

import { clearNotificationStates } from "./notificationStates"

const storage = new Storage()

export async function clearPluginTokenOnly() {
  try {
    await storage.remove("token")
    await storage.remove("token_expiry")
    await storage.remove("token_type")

    await storage.remove("user_info")

    // 清理通知状态
    await clearNotificationStates()

    return true
  } catch {
    return false
  }
}
