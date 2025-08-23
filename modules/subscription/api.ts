import { api } from "~/lib/api/PackyCodeApiClient"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { type SubscriptionApiResponse } from "~/types"

const logger = loggers.subscription

export async function fetchSubscriptionInfo(): Promise<null | SubscriptionApiResponse> {
  try {
    // 使用统一的API客户端，自动处理URL适配、认证和错误处理
    const subscriptionData = await api.getSubscriptions()

    // 存储API响应数据
    const storageManager = await getStorageManager()
    await storageManager.set(
      StorageDomain.SUBSCRIPTION_INFO,
      subscriptionData,
      true
    )

    logger.debug("Subscription info fetched and stored successfully")
    return subscriptionData
  } catch (error) {
    // 统一API客户端已经处理了认证错误和token清理
    // 这里只需要处理业务逻辑错误
    if (error instanceof Error && error.name === "AuthenticationError") {
      logger.debug("Authentication failed, returning null")
      return null
    }

    // 其他错误继续抛出
    const errorMessage =
      error instanceof Error ? error.message : "获取订阅信息失败"
    logger.error("Failed to fetch subscription info:", errorMessage)
    throw new Error(errorMessage)
  }
}
