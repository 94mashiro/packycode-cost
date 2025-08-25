/**
 * 模块重定义：防止业务代码直接使用 @plasmohq/storage
 *
 * 此文件重新定义了 @plasmohq/storage 模块的导出，
 * 在业务代码中导入时会显示错误提示
 */

declare module "@plasmohq/storage" {
  // 重新定义 Storage 类，添加编译时警告
  export class Storage {
    /**
     * ❌ 不允许在业务代码中直接使用 Plasmo Storage
     *
     * 请使用 ~/lib/storage 中的抽象层：
     * ```typescript
     * import { getStorageManager } from "~/lib/storage"
     * const storage = await getStorageManager()
     * ```
     *
     * @deprecated 请使用抽象层 getStorageManager()
     */
    constructor()

    /**
     * @deprecated 请使用 storageManager.get(StorageDomain.XXX)
     */
    get<T>(key: string): Promise<null | T>

    /**
     * @deprecated 请使用 storageManager.remove(StorageDomain.XXX)
     */
    remove(key: string): Promise<void>

    /**
     * @deprecated 请使用 storageManager.set(StorageDomain.XXX, value)
     */
    set<T>(key: string, value: T): Promise<void>

    /**
     * @deprecated 请使用 storageManager.onDomainChange()
     */
    watch(
      config: Record<
        string,
        (change: { newValue?: unknown; oldValue?: unknown }) => void
      >
    ): void
  }
}

// 导出类型以防止 TypeScript 错误
export {}
