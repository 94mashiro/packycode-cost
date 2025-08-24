/**
 * Peer Spending 模块导出
 *
 * Martin Fowler: "模块应该有清晰的公共接口"
 * 仅导出必要的公共 API
 */

export { fetchPeerSpendingToday, isPrivateMode } from "./api"
export { useCombinedSpendingRanking } from "./hooks/useCombinedSpendingRanking"
export type {
  CombinedSpendingRankingData,
  RankingParticipant,
  RankingSummary
} from "./hooks/useCombinedSpendingRanking"
