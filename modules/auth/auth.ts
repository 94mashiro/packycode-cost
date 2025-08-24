import type { AuthStorage } from "~/types"

import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"

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

/**
 * 用户主动登出
 *
 * KISS 原则：只在用户明确选择登出时调用
 *
 * @returns true 如果成功登出，false 如果操作失败
 */
export async function userLogout(): Promise<boolean> {
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
