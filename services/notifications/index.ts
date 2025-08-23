import type { NotificationStates } from "~/types"

import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"

export { type NotificationStates }

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
  const storageManager = await getStorageManager()
  await storageManager.set(StorageDomain.NOTIFICATION_STATES, {}, true)
}

/**
 * 获取通知状态
 */
export async function getNotificationStates(): Promise<NotificationStates> {
  const storageManager = await getStorageManager()
  const states = await storageManager.get<NotificationStates>(
    StorageDomain.NOTIFICATION_STATES
  )
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
  const storageManager = await getStorageManager()
  await storageManager.set(StorageDomain.NOTIFICATION_STATES, {
    opus_enabled: enabled
  })
}

/**
 * 更新购买状态
 * 单一职责：只负责更新存储
 */
export async function setPurchaseState(disabled: boolean): Promise<void> {
  const storageManager = await getStorageManager()
  await storageManager.set(StorageDomain.NOTIFICATION_STATES, {
    purchase_disabled: disabled
  })
}
