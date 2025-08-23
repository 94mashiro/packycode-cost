import { useSystemPreference } from "~/hooks/infrastructure/useStorageHooks"
import { type OpusStatusData } from "~/types"

/**
 * Opus 状态 Hook
 *
 * 重构说明：
 * - 移除直接使用 chrome.storage.onChanged 的监听
 * - 使用统一的 useSystemPreference Hook（基于 Plasmo Storage）
 * - 从系统偏好中提取 opus_enabled 字段
 * - 保持相同的 API 接口
 */
export function useOpusStatus(): OpusStatusData & {
  refresh: () => Promise<void>
} {
  const { data: systemPref, error, loading, refresh } = useSystemPreference()

  // 从系统偏好中提取 opus_enabled 状态
  const enabled =
    systemPref && typeof systemPref.opus_enabled === "boolean"
      ? systemPref.opus_enabled
      : null

  return {
    enabled,
    error,
    loading,
    refresh
  }
}
