import { dynamicUserApi } from "~/api"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { clearPluginTokenOnly } from "~/modules/auth"
import {
  type AuthStorage,
  type SubscriptionApiResponse,
  TokenType
} from "~/types"

const logger = loggers.subscription

export async function fetchSubscriptionInfo(): Promise<null | SubscriptionApiResponse> {
  try {
    const storageManager = await getStorageManager()
    const authData = await storageManager.get<AuthStorage>(StorageDomain.AUTH)
    logger.debug("Auth data:", authData)

    // 完全复制 fetchUserInfo 的认证逻辑
    if (!authData?.token) {
      logger.debug("No token found")
      return null
    }

    // JWT需要检查过期时间（如果有expiry的话）
    if (
      authData.type === TokenType.JWT &&
      authData.expiry &&
      authData.expiry < Date.now()
    ) {
      await clearPluginTokenOnly()
      return null
    }

    // 使用 dynamicUserApi 调用接口（内部使用 lib/request）
    const result = await dynamicUserApi.getSubscriptions(
      authData.token,
      authData.type
    )

    if (!result.success) {
      // 检查是否是认证错误
      if (
        result.error?.includes("400") ||
        result.error?.includes("401") ||
        result.error?.includes("403")
      ) {
        await clearPluginTokenOnly()
        return null
      }
      throw new Error(result.error || "获取订阅信息失败")
    }

    // 直接存储原始 API 响应
    await storageManager.set(StorageDomain.SUBSCRIPTION_INFO, result.data, true)

    logger.debug("Subscription info fetched and stored successfully")
    return result.data
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "获取订阅信息失败")
  }
}
