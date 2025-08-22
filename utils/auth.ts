import { getStorageManager } from "./storage"
import { StorageDomain } from "./storage/domains"

export async function clearPluginTokenOnly() {
  try {
    const storageManager = await getStorageManager()

    // 清理认证信息
    await storageManager.set(StorageDomain.AUTH, null)

    // 清理用户信息
    await storageManager.set(StorageDomain.USER_INFO, null)

    // 清理系统偏好
    await storageManager.set(StorageDomain.SYSTEM_PREFERENCE, null)

    return true
  } catch {
    return false
  }
}
