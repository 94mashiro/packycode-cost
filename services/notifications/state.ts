import type { NotificationStates } from "~/types"

import {
  getActiveAccountData,
  setActiveAccountData
} from "~/lib/storage/activeAccountHelpers"
import { StorageDomain } from "~/lib/storage/domains"

export { type NotificationStates }

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

export async function clearNotificationStates(): Promise<void> {
  await setActiveAccountData(StorageDomain.NOTIFICATION_STATES, {}, true)
}

export async function getNotificationStates(): Promise<NotificationStates> {
  const states = await getActiveAccountData<NotificationStates>(
    StorageDomain.NOTIFICATION_STATES
  )
  return states || {}
}

export async function getOpusState(): Promise<boolean | undefined> {
  const states = await getNotificationStates()
  return states.opus_enabled
}

export async function getPurchaseState(): Promise<boolean | undefined> {
  const states = await getNotificationStates()
  return states.purchase_disabled
}

export async function setOpusState(enabled: boolean): Promise<void> {
  await setActiveAccountData(StorageDomain.NOTIFICATION_STATES, {
    opus_enabled: enabled
  })
}

export async function setPurchaseState(disabled: boolean): Promise<void> {
  await setActiveAccountData(StorageDomain.NOTIFICATION_STATES, {
    purchase_disabled: disabled
  })
}
