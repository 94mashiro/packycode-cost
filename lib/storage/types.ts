/**
 * 存储抽象层类型防护
 *
 * 此文件定义了存储层的类型约束，防止业务代码直接使用底层 API
 */

import type { Storage } from "@plasmohq/storage"

/**
 * 类型守卫：确保业务代码不能访问底层存储实例
 *
 * 使用 never 类型阻止业务代码实例化 Storage
 */
export type BusinessStorageAccess = never

/**
 * 编译时检查宏
 *
 * 如果在业务代码中看到此类型，说明违反了抽象层原则
 */
export type DirectStorageUsageViolation =
  "❌ 不允许直接使用 Plasmo Storage API。请使用 ~/lib/storage 抽象层。"

/**
 * 🚫 禁止业务代码直接使用的底层类型
 *
 * 该类型被标记为 @internal，仅供存储抽象层内部使用
 * 如果业务代码尝试使用此类型，TypeScript 会发出警告
 *
 * @internal
 */
export type InternalStorage = Storage

/**
 * 存储操作的标准接口
 *
 * 业务代码应该使用这个接口，而不是直接使用 Plasmo Storage
 */
export interface StorageInterface {
  get<T>(domain: string): Promise<null | T>
  getCurrentVersion(): string
  onDomainChange(domain: string, callback: () => void): () => void
  onVersionChange(callback: (version: string) => void): () => void
  set<T>(domain: string, value: T): Promise<void>
  setCurrentVersion(version: string): Promise<void>
}
