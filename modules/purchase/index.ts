/**
 * 购买模块
 *
 * Linus: "购买状态检查是关键路径，必须可靠"
 * Dan: "状态变化应该是可预测的"
 */

// 统一的购买状态检查
export { checkAndNotifyPurchaseStatus } from "./checker"
export { getCurrentPurchaseConfig } from "./status"
