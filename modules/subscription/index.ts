/**
 * 订阅模块统一导出
 *
 * 模块化设计原则：
 * - 对外提供清晰的API边界
 * - 隐藏内部实现细节
 * - 便于整体模块的使用和测试
 */

// API 层
export { fetchSubscriptionInfo } from "./api"

// 主要导出 - 供任务注册表使用
export { fetchSubscriptionInfo as default } from "./api"

// 组件层
export { SubscriptionDisplay } from "./components/SubscriptionDisplay"
export { SubscriptionError } from "./components/SubscriptionError"
export { SubscriptionSkeleton } from "./components/SubscriptionSkeleton"
// 注意：SubscriptionEmpty 已移除，因为无数据时组件直接返回 null

// Hook 层
export { useSubscriptionDisplay } from "./hooks/useSubscriptionDisplay"

// 数据转换层
export { convertSubscriptionToPackageInfo, type PackageInfo } from "./mapper"
