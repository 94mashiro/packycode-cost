/**
 * PackySite 站点工具函数
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "集中管理配置，单一数据源"
 * ⚛️ Dan: "清晰的命名，易于理解"
 * ☕ Bloch: "不可变的映射表，类型安全"
 * 🏛️ Fowler: "封装变化，易于维护"
 *
 * 职责：
 * - 提供站点枚举到显示文案的统一映射
 * - 避免在多处重复定义相同的映射逻辑
 * - 保证所有站点名称的一致性
 */

import { PackySite } from "~/types/account"

/**
 * 站点名称映射表（不可变）
 * 单一数据源，所有站点显示名称从这里获取
 */
const SITE_DISPLAY_NAMES: Readonly<Record<PackySite, string>> = {
  [PackySite.CODEX]: "Codex站",
  [PackySite.SHARED]: "拼车站",
  [PackySite.WWW]: "主站"
} as const

/**
 * 获取站点的账号名称描述
 * 用于生成默认账号显示名称
 *
 * @param site - PackySite 枚举值
 * @returns 账号名称描述（如 "主站账号"、"拼车站账号"）
 *
 * @example
 * ```typescript
 * getSiteAccountName(PackySite.WWW)     // "主站账号"
 * getSiteAccountName(PackySite.SHARED)  // "拼车站账号"
 * getSiteAccountName(PackySite.CODEX)   // "Codex站账号"
 * ```
 */
export function getSiteAccountName(site: PackySite): string {
  return `${SITE_DISPLAY_NAMES[site]}账号`
}

/**
 * 获取站点的完整域名
 *
 * @param site - PackySite 枚举值
 * @returns 完整域名
 *
 * @example
 * ```typescript
 * getSiteDomain(PackySite.WWW)     // "www.packycode.com"
 * getSiteDomain(PackySite.SHARED)  // "share.packycode.com"
 * getSiteDomain(PackySite.CODEX)   // "codex.packycode.com"
 * ```
 */
export function getSiteDomain(site: PackySite): string {
  return site
}

/**
 * 获取站点的显示名称
 *
 * @param site - PackySite 枚举值
 * @returns 站点显示名称（如 "主站"、"拼车站"、"Codex站"）
 *
 * @example
 * ```typescript
 * getSiteName(PackySite.WWW)     // "主站"
 * getSiteName(PackySite.SHARED)  // "拼车站"
 * getSiteName(PackySite.CODEX)   // "Codex站"
 * ```
 */
export function getSiteName(site: PackySite): string {
  return SITE_DISPLAY_NAMES[site]
}
