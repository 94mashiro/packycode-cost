/**
 * 通知状态检查函数（简化版）
 *
 * 不再使用独立的 NOTIFICATION_STATES 存储域，
 * 状态检查逻辑已内置在各模块的 API 函数中
 */

export function checkOpusNotification(
  previousState: boolean | undefined,
  currentState: boolean
): boolean {
  return previousState !== undefined && previousState !== currentState
}

export function checkPurchaseNotification(
  previousState: boolean | undefined,
  currentDisabled: boolean
): boolean {
  return previousState === true && currentDisabled === false
}
