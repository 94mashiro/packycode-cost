import { api } from "~/lib/api/PackyCodeApiClient"
import { AccountManager } from "~/lib/account"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { type SystemPreferenceStorage, type UserInfo } from "~/types"
import { PackySite } from "~/types/account"
import { triggerOpusStatusNotification } from "~/utils/notificationTriggers"
import { checkOpusNotificationPermission } from "~/utils/notificationPermissions"
import { getSiteName } from "~/utils/siteHelpers"

const logger = loggers.auth

export async function fetchUserInfo(
  context: import("~/types").AccountContext
): Promise<null | UserInfo> {
  try {
    // 直接从 context 解构所需信息，无需查询
    const { accountId, site } = context
    const storageManager = getStorageManager()

    // 使用统一的API客户端，传递完整上下文
    const rawData = await api.getUserInfo(context)

    // 转换为新的存储格式
    const dailyLimit = Number(rawData.daily_budget_usd) || 0
    const dailySpent = Number(rawData.daily_spent_usd) || 0
    const monthlyLimit = Number(rawData.monthly_budget_usd) || 0
    const monthlySpent = Number(rawData.monthly_spent_usd) || 0

    const userInfoStorage: UserInfo = {
      balance_usd: rawData.balance_usd, // 主站下的账户余额
      budgets: {
        daily: {
          limit: dailyLimit,
          remaining: Math.max(0, dailyLimit - dailySpent),
          spent: dailySpent
        },
        monthly: {
          limit: monthlyLimit,
          remaining: Math.max(0, monthlyLimit - monthlySpent),
          spent: monthlySpent
        }
      }
      // 删除无用的 id 硬编码 - 该字段无实际用途
    }

    // 只在主站下处理 opus_enabled 状态变化（排除 CODEX，因为没有 Opus 模型）
    if (site === PackySite.WWW) {
      // 检查 opus_enabled 状态变化
      const systemPref = await storageManager.get<SystemPreferenceStorage>(
        accountId,
        StorageDomain.SYSTEM_PREFERENCE
      )
      const previousOpusState = systemPref?.opus_enabled
      const currentOpusState = Boolean(rawData.opus_enabled)

      // 判断是否需要通知
      const shouldNotify = checkOpusNotification(
        previousOpusState,
        currentOpusState
      )

      if (shouldNotify) {
        // 检查用户是否开启了 Opus 通知（站点级控制）
        const notificationEnabled = await checkOpusNotificationPermission(site)

        if (notificationEnabled) {
          logger.info(
            `Opus status changed (主站): ${previousOpusState} → ${currentOpusState}`
          )
          await triggerOpusStatusNotification(currentOpusState)
        } else {
          logger.debug("Opus notification disabled by user settings, skipping")
        }
      }

      // 更新系统偏好
      await storageManager.set(accountId, StorageDomain.SYSTEM_PREFERENCE, {
        opus_enabled: currentOpusState
      })
    } else {
      const siteName = getSiteName(site)
      const siteNote =
        site === PackySite.SHARED
          ? "，由 SharedSpace API 负责管理"
          : site === PackySite.CODEX
            ? "，没有 Opus 模型"
            : ""

      logger.debug(`⏭️ 跳过 Opus 状态更新：当前为${siteName}模式${siteNote}`)
    }

    // 存储用户信息
    await storageManager.set(
      accountId,
      StorageDomain.USER_INFO,
      userInfoStorage
    )

    // 回写 token 可用性：成功即有效
    try {
      const accountManager = new AccountManager(storageManager)
      await accountManager.setTokenValidation(accountId, {
        status: "valid",
        checkedAt: Date.now(),
        source: "user_info"
      })
    } catch (e) {
      logger.debug("Failed to set tokenValidation (success path):", e)
    }

    return userInfoStorage
  } catch (error) {
    // 统一API客户端已经处理了认证错误和token清理
    // 这里只需要处理业务逻辑错误
    if (error instanceof Error && error.name === "AuthenticationError") {
      logger.debug("Authentication failed, returning null")
      // 回写 token 可用性：认证失败
      try {
        const storageManager = getStorageManager()
        const accountManager = new AccountManager(storageManager)
        await accountManager.setTokenValidation(context.accountId, {
          status: "invalid",
          checkedAt: Date.now(),
          httpStatus: 401,
          reason: error.message,
          source: "user_info"
        })
      } catch (e) {
        logger.debug("Failed to set tokenValidation (auth error):", e)
      }
      return null
    }

    // 其他错误继续抛出
    const errorMessage =
      error instanceof Error ? error.message : "获取用户信息失败"
    logger.error("Failed to fetch user info:", errorMessage)

    // 回写 token 可用性：网络类错误（不改变 lastSyncAt）
    try {
      const storageManager = getStorageManager()
      const accountManager = new AccountManager(storageManager)
      await accountManager.setTokenValidation(context.accountId, {
        status: "network_error",
        checkedAt: Date.now(),
        reason: errorMessage,
        source: "user_info"
      })
    } catch (e) {
      logger.debug("Failed to set tokenValidation (network error):", e)
    }
    throw new Error(errorMessage)
  }
}

/**
 * 检查是否需要Opus状态通知
 */
function checkOpusNotification(
  previousState: boolean | undefined,
  currentState: boolean
): boolean {
  // 仅在状态从其他值变为 true 时通知
  return previousState !== true && currentState === true
}
