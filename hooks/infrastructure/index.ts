/**
 * 基础设施 Hooks
 *
 * 跨模块复用的存储访问层：
 * - 通用存储抽象 (useStorage)
 * - 类型安全的存储访问 (useStorageHooks)
 */

export { useStorage } from "./useStorage"
export * from "./useStorageHooks"
