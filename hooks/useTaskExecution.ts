import { useCallback, useState } from "react"

import { fetchAllDataAsync } from "~/modules/tasks"

/**
 * 任务执行状态管理 Hook
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "状态管理要简单直接，不增加系统复杂度"
 * ⚛️ Dan: "封装异步操作，提供清晰的状态反馈"
 * ☕ Bloch: "API设计要直观，错误处理要完善"
 * 🏛️ Fowler: "分离关注点，UI状态与业务逻辑解耦"
 */

export interface UseTaskExecutionReturn {
  /** 执行所有数据获取任务 */
  executeAll: () => Promise<void>
  /** 是否正在执行任务 */
  loading: boolean
}

/**
 * 任务执行状态管理 Hook
 *
 * 提供统一的任务执行状态管理，用于RefreshButton等UI组件
 */
export function useTaskExecution(): UseTaskExecutionReturn {
  const [loading, setLoading] = useState(false)

  const executeAll = useCallback(async () => {
    if (loading) {
      // 防止重复执行
      return
    }

    setLoading(true)
    try {
      await fetchAllDataAsync()
    } finally {
      setLoading(false)
    }
  }, [loading])

  return {
    executeAll,
    loading
  }
}
