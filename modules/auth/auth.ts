import type { AuthStorage } from "~/types"

import { getActiveAccountData } from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"

/**
 * 获取存储的认证token
 */
export async function getStoredToken(): Promise<null | string> {
  try {
    const authData = await getActiveAccountData<AuthStorage>(StorageDomain.AUTH)
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
    const { setActiveAccountData } = await import(
      "~/lib/storage/activeAccountHelpers"
    )

    // 清理认证信息
    await setActiveAccountData(StorageDomain.AUTH, null)

    // 清理用户信息
    await setActiveAccountData(StorageDomain.USER_INFO, null)

    // 清理系统偏好
    await setActiveAccountData(StorageDomain.SYSTEM_PREFERENCE, null)

    return true
  } catch {
    return false
  }
}
