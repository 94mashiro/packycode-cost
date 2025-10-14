/**
 * 限流时间格式化工具函数
 *
 * 🐧 Linus: "工具函数应该简单直接，不引入不必要的依赖"
 * ⚛️ Dan: "纯函数设计，易于测试"
 */

export interface RateLimitTimeRemaining {
  /** 天数 */
  days: number
  /** 小时数 */
  hours: number
  /** 分钟数 */
  minutes: number
  /** 总毫秒数 */
  totalMs: number
}

/**
 * 计算距离目标时间的剩余时间
 * @param targetTime ISO 8601 时间字符串或 Date 对象
 * @returns 剩余时间对象，如果已过期返回全0
 */
export function calculateTimeRemaining(
  targetTime: Date | string
): RateLimitTimeRemaining {
  const target =
    typeof targetTime === "string" ? new Date(targetTime) : targetTime
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, totalMs: 0 }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes, totalMs: diff }
}

/**
 * 格式化5小时档的剩余时间
 * @param resetsAt 重置时间
 * @returns 格式化字符串，例如 "4h 23m"
 */
export function formatFiveHourRemaining(resetsAt: string): string {
  const { hours, minutes, totalMs } = calculateTimeRemaining(resetsAt)

  if (totalMs <= 0) {
    return "已重置"
  }

  return `${hours}h ${minutes}m`
}

/**
 * 格式化7天档的剩余时间
 * @param resetsAt 重置时间
 * @returns 格式化字符串，例如 "6d 14h"
 */
export function formatSevenDayRemaining(resetsAt: string): string {
  const { days, hours, totalMs } = calculateTimeRemaining(resetsAt)

  if (totalMs <= 0) {
    return "已重置"
  }

  if (days > 0) {
    return `${days}d ${hours}h`
  }

  // 小于1天时显示小时和分钟
  const { minutes } = calculateTimeRemaining(resetsAt)
  return `${hours}h ${minutes}m`
}
