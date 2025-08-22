import type { AuthStorage } from "~/types"

import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"

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

/**
 * 获取存储的认证token
 */
export async function getStoredToken(): Promise<null | string> {
  try {
    const storageManager = await getStorageManager()
    const authData = await storageManager.get<AuthStorage>(StorageDomain.AUTH)
    return authData?.token || null
  } catch {
    return null
  }
}
