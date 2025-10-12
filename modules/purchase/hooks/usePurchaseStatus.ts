import { useCapabilities } from "~/hooks/infrastructure/useStorageHooks"
import { type PackyConfig, type PurchaseStatusData } from "~/types"

/**
 * 购买状态 Hook
 *
 * 重构说明：
 * - 从 CAPABILITIES 领域读取 purchaseDisabled 字段
 * - 使用统一的 useCapabilities Hook（基于 Plasmo Storage）
 * - 返回 purchaseDisabled 布尔值（而非完整的 config 对象）
 */
export function usePurchaseStatus(): PurchaseStatusData & {
  refresh: () => Promise<void>
} {
  const { data: capabilities, error, loading, refresh } = useCapabilities()

  // 包装为 config 对象以保持接口兼容
  // 注意：purchaseUrl 和 anthropicBaseUrl 应该从 API 配置中获取，不再存储
  const config: null | PackyConfig = capabilities
    ? {
        anthropicBaseUrl: "", // 废弃，不再使用
        purchaseDisabled: capabilities.purchaseDisabled ?? false,
        purchaseUrl: "", // 废弃，应从站点 URL 派生
        supportEmail: "" // 废弃，不再使用
      }
    : null

  return {
    config,
    error,
    loading,
    refresh
  }
}
