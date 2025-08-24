import { useEffect, useState } from "react"

/**
 * 重置时间倒计时 Hook
 *
 * 四师设计理念：
 * 🐧 Linus: 性能优化，自动停止过期的定时器
 * ⚛️ Dan: 纯粹的 Hook 设计，单一职责
 * ☕ Bloch: 清晰的 API，明确的返回值类型
 * 🏛️ Fowler: 领域逻辑封装，时间计算与 UI 分离
 */

interface CountdownTime {
  hours: number
  minutes: number
  seconds: number
}

interface UseResetCountdownOptions {
  /** 是否启用倒计时 */
  enabled?: boolean
  /** API 返回的重置时间戳 */
  rateLimitResetAt?: null | string
}

interface UseResetCountdownReturn {
  /** 是否已过期 */
  isExpired: boolean
  /** 是否应该显示倒计时 */
  shouldShow: boolean
  /** 倒计时时间 */
  timeLeft: CountdownTime
}

/**
 * 格式化时间显示
 */
export function formatCountdownTime(value: number): string {
  return value.toString().padStart(2, "0")
}

/**
 * 获取完整的倒计时字符串
 */
export function getCountdownDisplay(time: CountdownTime): string {
  return `${formatCountdownTime(time.hours)}:${formatCountdownTime(time.minutes)}:${formatCountdownTime(time.seconds)}`
}

/**
 * 重置倒计时 Hook
 *
 * @param options 配置选项
 * @returns 倒计时状态
 */
export function useResetCountdown({
  enabled = true,
  rateLimitResetAt
}: UseResetCountdownOptions = {}): UseResetCountdownReturn {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>({
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [isExpired, setIsExpired] = useState(false)

  // 决定是否显示倒计时
  // undefined: 未传入参数（公交车模式），显示默认倒计时
  // null: 明确不显示（滴滴车模式无限制）
  // string: 显示 API 返回的倒计时（滴滴车模式有限制）
  const shouldShow =
    enabled &&
    (rateLimitResetAt === undefined || // 公交车模式
      (rateLimitResetAt !== null && rateLimitResetAt !== undefined)) // 滴滴车模式有时间限制

  useEffect(() => {
    if (!shouldShow) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
      setIsExpired(false)
      return
    }

    const targetTime = calculateTargetTime(rateLimitResetAt)
    if (!targetTime) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
      setIsExpired(false)
      return
    }

    const updateCountdown = (): boolean => {
      const now = new Date()
      const diff = targetTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 })
        setIsExpired(true)
        return false // 停止更新
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ hours, minutes, seconds })
      setIsExpired(false)
      return true // 继续更新
    }

    // 立即更新一次
    const shouldContinue = updateCountdown()
    if (!shouldContinue) {
      return
    }

    // 设置定时器
    const interval = setInterval(() => {
      const shouldContinue = updateCountdown()
      if (!shouldContinue) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [rateLimitResetAt, shouldShow])

  return {
    isExpired,
    shouldShow,
    timeLeft
  }
}

/**
 * 计算目标重置时间
 */
function calculateTargetTime(rateLimitResetAt?: null | string): Date | null {
  // 如果明确传入 null，表示不需要倒计时
  if (rateLimitResetAt === null) {
    return null
  }

  // 如果有 API 返回的时间戳，使用它
  if (rateLimitResetAt) {
    return new Date(rateLimitResetAt)
  }

  // 默认：每日零点重置
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow
}
