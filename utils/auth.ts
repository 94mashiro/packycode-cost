import { Storage } from "@plasmohq/storage"

import { STORAGE_KEYS } from "./storage-keys"

const storage = new Storage()

export async function clearPluginTokenOnly() {
  try {
    // 清理认证信息
    await storage.remove(STORAGE_KEYS.AUTH)

    // 清理用户信息
    await storage.remove(STORAGE_KEYS.USER_INFO)

    // 清理系统偏好
    await storage.remove(STORAGE_KEYS.SYSTEM_PREFERENCE)

    return true
  } catch {
    return false
  }
}
