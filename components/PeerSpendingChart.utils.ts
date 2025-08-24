/**
 * PeerSpendingChart 工具函数
 *
 * 设计原则：
 * 🐧 Linus: "DRY原则 - 不要重复自己"
 * ⚛️ Dan: "纯函数便于测试和理解"
 */

import type { RankingParticipant } from "~/modules/peerSpending"

import {
  RANK_COLOR_SCHEME,
  RankLevel,
  STYLES
} from "./PeerSpendingChart.constants"

/**
 * 格式化金额显示
 */
export function formatAmount(
  amount: number | undefined,
  defaultValue: string
): string {
  if (amount === undefined || amount === null) {
    return defaultValue
  }
  return amount.toFixed(2)
}

/**
 * 生成稳定的组件key
 * 使用用户名和排名的组合，确保唯一性
 */
export function generateParticipantKey(
  participant: RankingParticipant
): string {
  // 如果是当前用户，添加特殊标识确保key稳定
  const userIdentifier = participant.isCurrentUser
    ? "current-user"
    : participant.displayName
  return `${userIdentifier}-rank-${participant.rank}`
}

/**
 * 获取容器样式类名
 */
export function getContainerClassName(isCurrentUser: boolean): string {
  return isCurrentUser ? STYLES.CURRENT_USER_CONTAINER : STYLES.HOVER_EFFECT
}

/**
 * 获取排名徽章颜色
 */
export function getRankBadgeStyle(
  rank: number,
  isCurrentUser: boolean
): string {
  const scheme = getRankColorScheme(rank)

  if (isCurrentUser) {
    return `${scheme.badge} ${STYLES.CURRENT_USER_HIGHLIGHT} ${scheme.border}`
  }

  return scheme.badge
}

/**
 * 获取排名对应的颜色方案
 */
export function getRankColorScheme(rank: number) {
  const scheme =
    RANK_COLOR_SCHEME[rank as RankLevel] || RANK_COLOR_SCHEME.DEFAULT
  return scheme
}

/**
 * 获取排名进度条颜色
 */
export function getRankGradient(rank: number): string {
  return getRankColorScheme(rank).gradient
}
