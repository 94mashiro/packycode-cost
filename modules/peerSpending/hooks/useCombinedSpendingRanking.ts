import { useMemo } from "react"

import { useBudgetDisplay } from "~/components/budget"

import { usePeerSpending } from "./usePeerSpending"

/**
 * 整合同行排行榜业务 Hook
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "业务逻辑要简洁，数据整合要高效"
 * ⚛️ Dan: "上层Hook整合底层数据源，提供统一业务视图"
 * ☕ Bloch: "API设计要完整，涵盖所有业务需求"
 * 🏛️ Fowler: "领域驱动设计，完整的排行榜聚合根"
 */

/** 整合排行榜数据 */
export interface CombinedSpendingRankingData {
  /** 错误信息 */
  error: null | string
  /** 是否正在加载（遵循SWR模式） */
  loading: boolean
  /** 排行榜参与者列表（按消费排序） */
  rankings: RankingParticipant[]
  /** 汇总统计信息 */
  summary: RankingSummary
}

/** 排行榜参与者信息 */
export interface RankingParticipant {
  /** 显示名称 */
  displayName: string
  /** 是否为当前用户 */
  isCurrentUser: boolean
  /** 相对百分比（基于最高消费） */
  percentage: number
  /** 排名位置 */
  rank: number
  /** 今日消费金额 */
  spentToday: number
}

/** 排行榜汇总统计 */
export interface RankingSummary {
  /** 平均消费（包含当前用户） */
  averageSpent: number
  /** 当前用户排名 */
  currentUserRank: number
  /** 总参与人数（包含当前用户） */
  totalParticipants: number
  /** 总消费金额（包含当前用户） */
  totalSpent: number
}

/**
 * 整合乘客消费排行榜业务Hook
 *
 * 职责：
 * 1. 整合同行数据和当前用户预算数据
 * 2. 计算完整的消费排行榜
 * 3. 提供统一的业务数据视图
 * 4. 智能处理多数据源的状态管理
 */
export function useCombinedSpendingRanking(): CombinedSpendingRankingData {
  // 底层数据源
  const {
    data: peerData,
    error: peerError,
    loading: peerLoading
  } = usePeerSpending()
  const {
    budgetData,
    error: budgetError,
    loading: budgetLoading
  } = useBudgetDisplay()

  // 数据整合和排行榜计算
  const rankingResult = useMemo(() => {
    // 如果任一数据源出错，返回错误状态
    const error = peerError || budgetError
    if (error) {
      return {
        error,
        loading: false,
        rankings: [],
        summary: {
          averageSpent: 0,
          currentUserRank: 0,
          totalParticipants: 0,
          totalSpent: 0
        }
      }
    }

    // 如果没有同行数据，返回空状态（这是正常情况，可能不在滴滴车模式）
    if (!peerData || !peerData.topPeers.length) {
      return {
        error: null,
        loading: peerLoading && !peerData, // 遵循SWR模式
        rankings: [],
        summary: {
          averageSpent: 0,
          currentUserRank: 0,
          totalParticipants: 0,
          totalSpent: 0
        }
      }
    }

    // 获取当前用户消费数据
    const currentUserSpent = budgetData?.dailySpent ?? 0

    // 整合所有参与者数据
    const allParticipants = [
      // 同行数据
      ...peerData.topPeers.map((peer) => ({
        displayName: peer.displayName,
        isCurrentUser: false,
        spentToday: peer.spentToday
      })),
      // 当前用户数据
      {
        displayName: "你",
        isCurrentUser: true,
        spentToday: currentUserSpent
      }
    ]

    // 按消费金额排序
    const sortedParticipants = allParticipants.sort(
      (a, b) => b.spentToday - a.spentToday
    )

    // 计算排名和百分比
    const maxSpent = Math.max(...sortedParticipants.map((p) => p.spentToday))
    const rankings: RankingParticipant[] = sortedParticipants.map(
      (participant, index) => ({
        ...participant,
        percentage:
          maxSpent > 0 ? (participant.spentToday / maxSpent) * 100 : 0,
        rank: index + 1
      })
    )

    // 计算汇总统计
    const totalSpent = sortedParticipants.reduce(
      (sum, p) => sum + p.spentToday,
      0
    )
    const averageSpent = totalSpent / sortedParticipants.length
    const currentUserRank = rankings.find((r) => r.isCurrentUser)?.rank ?? 0

    return {
      error: null,
      loading: (peerLoading && !peerData) || (budgetLoading && !budgetData), // SWR模式
      rankings,
      summary: {
        averageSpent: Math.round(averageSpent * 100) / 100,
        currentUserRank,
        totalParticipants: sortedParticipants.length,
        totalSpent: Math.round(totalSpent * 100) / 100
      }
    }
  }, [peerData, peerError, peerLoading, budgetData, budgetError, budgetLoading])

  return rankingResult
}
