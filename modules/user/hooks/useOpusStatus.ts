import { useCapabilities } from "~/hooks/infrastructure/useStorageHooks"
import { type OpusStatusData } from "~/types"

/**
 * Opus 状态 Hook
 *
 * 重构说明：
 * - 从 CAPABILITIES 领域读取 opusEnabled 字段
 * - 使用统一的 useCapabilities Hook（基于 Plasmo Storage）
 * - 保持相同的 API 接口
 */
export function useOpusStatus(): OpusStatusData & {
  refresh: () => Promise<void>
} {
  const { data: capabilities, error, loading, refresh } = useCapabilities()

  // 从 capabilities 领域中提取 opusEnabled 状态
  const enabled =
    capabilities && typeof capabilities.opusEnabled === "boolean"
      ? capabilities.opusEnabled
      : null

  return {
    enabled,
    error,
    loading,
    refresh
  }
}
