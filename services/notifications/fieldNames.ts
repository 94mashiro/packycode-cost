/**
 * 通知字段名生成器
 *
 * 设计原则（单一数据源）:
 * 🐧 Linus: "直接使用 site 枚举值，无需任何映射或转换"
 * ⚛️ Dan: "写入和读取必须使用同一个函数"
 * ☕ Bloch: "返回类型是 NotificationKey，确保类型安全"
 * 🏛️ Fowler: "让数据源保持一致，site 是唯一真实来源"
 *
 * 核心思想：
 * - account.site 是唯一数据源
 * - 字段名直接使用 site 枚举值（完整域名）
 * - 无需任何转换或映射
 */

import type { NotificationKey } from "~/types"

import { PackySite } from "~/types/account"

/**
 * 通知类型枚举
 */
export type NotificationType = "opus" | "purchase"

/**
 * 通知字段名生成器（类型安全版本）
 *
 * 职责：统一生成通知字段名，确保写入和读取使用相同逻辑
 *
 * @param type - 通知类型（"opus" | "purchase"）
 * @param site - PackySite 枚举值（完整域名）
 * @returns 通知字段名（类型安全）
 *
 * @throws {Error} 如果 Opus 通知不是 WWW 站点
 *
 * @example
 * ```typescript
 * getNotificationFieldName("purchase", PackySite.WWW)
 * // → "purchase_notification_www.packycode.com"
 *
 * getNotificationFieldName("purchase", PackySite.SHARED)
 * // → "purchase_notification_share.packycode.com"
 *
 * getNotificationFieldName("opus", PackySite.WWW)
 * // → "opus_notification_www.packycode.com"
 *
 * getNotificationFieldName("opus", PackySite.SHARED)
 * // → 抛出错误（Opus 仅支持主站）
 * ```
 */
export function getNotificationFieldName(
  type: NotificationType,
  site: PackySite
): NotificationKey {
  // Opus 通知仅支持主站
  if (type === "opus" && site !== PackySite.WWW) {
    throw new Error(
      `Opus notifications only supported for WWW site, got: ${site}`
    )
  }

  // ✅ 直接拼接 site 枚举值，无需任何转换
  // site = "www.packycode.com" → "purchase_notification_www.packycode.com"
  return `${type}_notification_${site}` as NotificationKey
}

/**
 * 批量生成通知字段名（用于 UI 层）
 *
 * @param type - 通知类型
 * @param sites - 站点列表
 * @returns 字段名数组
 *
 * @example
 * ```typescript
 * getNotificationFieldNames("purchase", [PackySite.WWW, PackySite.SHARED])
 * // → ["purchase_notification_www.packycode.com", "purchase_notification_share.packycode.com"]
 * ```
 */
export function getNotificationFieldNames(
  type: NotificationType,
  sites: PackySite[]
): NotificationKey[] {
  return sites.map((site) => getNotificationFieldName(type, site))
}
