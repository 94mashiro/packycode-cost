/**
 * Peer Spending API 模块
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "数据转换逻辑应该清晰且高效"
 * ⚛️ Dan: "保持数据流的可预测性"
 * ☕ Bloch: "API 应该正确处理边界情况"
 * 🏛️ Fowler: "将业务逻辑与数据获取分离"
 */

import { api } from "~/lib/api/PackyCodeApiClient"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import {
  AccountVersion,
  ApiEndpointType,
  type PeerSpendingApiResponse,
  type PeerSpendingStorage,
  type UserPreferenceStorage
} from "~/types"

const logger = loggers.api

/**
 * 获取同行消费数据
 * 仅在滴滴车模式下执行
 */
export async function fetchPeerSpendingToday(): Promise<null | PeerSpendingStorage> {
  try {
    // 1. 检查当前账号版本
    const storageManager = await getStorageManager()
    const userPreference = await storageManager.get<UserPreferenceStorage>(
      StorageDomain.USER_PREFERENCE
    )

    const currentVersion =
      userPreference?.account_version ?? AccountVersion.SHARED

    // 2. 仅在滴滴车模式下执行
    if (currentVersion !== AccountVersion.PRIVATE) {
      logger.debug("跳过同行消费数据获取：当前不是滴滴车模式")
      return null
    }

    logger.info("🚗 获取滴滴车模式同行消费数据...")

    // 3. 调用 API
    const rawData = await api.get<PeerSpendingApiResponse>(
      ApiEndpointType.PEER_SPENDING_TODAY
    )

    // 4. 数据转换和计算
    const peerSpendingData = transformPeerSpendingData(rawData)

    // 5. 存储数据
    await storageManager.set(
      StorageDomain.PEER_SPENDING,
      peerSpendingData,
      true
    )

    logger.info(`✅ 同行消费数据获取成功：${peerSpendingData.peerCount} 位同行`)

    return peerSpendingData
  } catch (error) {
    // 认证错误已由 API 客户端处理
    if (error instanceof Error && error.name === "AuthenticationError") {
      logger.debug("Authentication failed for peer spending, returning null")
      return null
    }

    // 其他错误记录但不抛出，避免影响其他任务
    const errorMessage =
      error instanceof Error ? error.message : "获取同行消费数据失败"
    logger.error("Failed to fetch peer spending data:", errorMessage)

    // 不抛出错误，返回 null
    return null
  }
}

/**
 * 检查是否为滴滴车模式
 * 用于条件渲染和任务执行判断
 */
export async function isPrivateMode(): Promise<boolean> {
  try {
    const storageManager = await getStorageManager()
    const userPreference = await storageManager.get<UserPreferenceStorage>(
      StorageDomain.USER_PREFERENCE
    )

    return userPreference?.account_version === AccountVersion.PRIVATE
  } catch {
    return false
  }
}

/**
 * 转换 API 响应为存储格式
 * 计算汇总数据和排行榜
 */
function transformPeerSpendingData(
  apiResponse: PeerSpendingApiResponse
): PeerSpendingStorage {
  const peers = apiResponse.peers || []

  // 转换消费金额为数字并计算总和
  const spendingValues = peers.map((peer) => {
    const spent = parseFloat(peer.spent_usd_today) || 0
    return {
      displayName: peer.display_name,
      spentToday: spent
    }
  })

  // 计算总消费和平均值
  const totalSpent = spendingValues.reduce(
    (sum, peer) => sum + peer.spentToday,
    0
  )
  const averageSpent = peers.length > 0 ? totalSpent / peers.length : 0

  // 按消费金额排序，取前5名
  const topPeers = spendingValues
    .sort((a, b) => b.spentToday - a.spentToday)
    .slice(0, 5)

  return {
    averageSpentToday: Math.round(averageSpent * 100) / 100,
    date: apiResponse.date,
    lastUpdated: new Date().toISOString(),
    peerCount: peers.length,
    topPeers,
    totalSpentToday: Math.round(totalSpent * 100) / 100 // 保留两位小数
  }
}
