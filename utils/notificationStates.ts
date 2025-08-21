import { Storage } from "@plasmohq/storage"

const storage = new Storage()

/**
 * 通知状态管理 - 替代垃圾的 last_* 字段
 * 存储各个功能的上次状态，用于检测状态变化
 */
export interface NotificationStates {
  opus_enabled?: boolean // Opus 模型上次的启用状态
  purchase_disabled?: boolean // 购买功能上次的禁用状态
}

/**
 * 检查 Opus 状态是否需要通知
 * 纯函数，无副作用，只负责判断逻辑
 */
export function checkOpusNotification(
  previousState: boolean | undefined,
  currentState: boolean
): boolean {
  // 状态变化时通知（undefined 表示首次，不通知）
  return previousState !== undefined && previousState !== currentState
}

/**
 * 检查购买状态是否需要通知
 * 纯函数，无副作用，只负责判断逻辑
 */
export function checkPurchaseNotification(
  previousState: boolean | undefined,
  currentDisabled: boolean
): boolean {
  // 只在从禁用（true）变为启用（false）时通知
  return previousState === true && currentDisabled === false
}

/**
 * 清理通知状态（用于登出时）
 */
export async function clearNotificationStates(): Promise<void> {
  await storage.remove("notification_states")
}

/**
 * 获取通知状态
 */
export async function getNotificationStates(): Promise<NotificationStates> {
  const states = await storage.get<NotificationStates>("notification_states")
  return states || {}
}

/**
 * 获取 Opus 上次状态
 */
export async function getOpusState(): Promise<boolean | undefined> {
  const states = await getNotificationStates()
  return states.opus_enabled
}

/**
 * 获取购买上次状态
 */
export async function getPurchaseState(): Promise<boolean | undefined> {
  const states = await getNotificationStates()
  return states.purchase_disabled
}

/**
 * 更新 Opus 状态
 * 单一职责：只负责更新存储
 */
export async function setOpusState(enabled: boolean): Promise<void> {
  const states = await getNotificationStates()
  await storage.set("notification_states", {
    ...states,
    opus_enabled: enabled
  })
}

/**
 * 更新购买状态
 * 单一职责：只负责更新存储
 */
export async function setPurchaseState(disabled: boolean): Promise<void> {
  const states = await getNotificationStates()
  await storage.set("notification_states", {
    ...states,
    purchase_disabled: disabled
  })
}
