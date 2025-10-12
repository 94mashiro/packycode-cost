import { api } from "~/lib/api/PackyCodeApiClient"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { type SubscriptionApiResponse } from "~/types"

const logger = loggers.subscription

export async function fetchSubscriptionInfo(
  context: import("~/types").AccountContext
): Promise<null | SubscriptionApiResponse> {
  try {
    // 直接从 context 解构所需信息
    const { accountId, site } = context
    const storageManager = getStorageManager()

    // 使用统一的API客户端，传入完整上下文
    const subscriptionData = await api.getSubscriptions(context)

    // 存储API响应数据
    await storageManager.set(
      accountId,
      StorageDomain.SUBSCRIPTION_INFO,
      subscriptionData
    )

    logger.debug(
      `Subscription info fetched and stored successfully for ${site}`
    )
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
