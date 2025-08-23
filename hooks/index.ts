/**
 * Hooks 统一导出点
 *
 * 🎯 设计理念：业务闭环 + 开发体验友好
 *
 * 经过四师(Linus/Dan/Fowler/Bloch)四轮Ultra讨论的最终方案：
 * - 🔧 基础设施：跨模块复用的技术能力
 * - 🧠 业务逻辑：从各模块重导出，保持统一导入体验
 * - 🌐 跨领域：纯跨领域Hook的专用位置
 * - 📦 向后兼容：现有导入路径保持有效
 */

// 🔧 基础设施层 - 跨模块技术能力
export * from "./infrastructure"

export { usePurchaseStatus } from "~/modules/purchase/hooks"

// 🧠 业务逻辑层 - 从模块重导出，保持开发体验
export { useOpusStatus, useVersionSwitcher } from "~/modules/user/hooks"

// 🌐 跨领域层 - 暂时为空，按需添加
// export * from './shared'

// 📝 类型统一导出 - 便于使用
export type { OpusStatusData, PurchaseStatusData, UserInfoData } from "~/types"
