/**
 * 开发工具统一入口
 * 条件编译：仅在开发环境可用
 * 遵循四师共识：去除全局污染，统一接口
 */

import { getCurrentApiConfigManager } from "~/api/config"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"

import { type DevToolsDependencies, DevToolsValidator } from "./validator"

/**
 * 创建开发工具验证器实例
 */
async function createDevToolsValidator(): Promise<DevToolsValidator> {
  const apiConfigManager = await getCurrentApiConfigManager()
  const storage = await getStorageManager()

  const dependencies: DevToolsDependencies = {
    apiConfigManager,
    logger: loggers.debug,
    storage
  }

  return new DevToolsValidator(dependencies)
}

/**
 * 便捷的验证函数集合
 * 替代原有的分散的全局函数
 */
export const devTools = {
  /**
   * 创建验证器实例
   */
  createValidator: createDevToolsValidator,

  /**
   * 验证账号切换
   */
  async validateAccountSwitching() {
    const validator = await createDevToolsValidator()
    return await validator.validateAccountSwitching()
  },

  /**
   * 快速验证所有配置
   */
  async validateAll() {
    const validator = await createDevToolsValidator()
    return await validator.runAllValidations()
  },

  /**
   * 验证API配置
   */
  async validateApiConfig() {
    const validator = await createDevToolsValidator()
    return await validator.validateApiConfiguration()
  },

  /**
   * 验证权限设置
   */
  async validatePermissions() {
    const validator = await createDevToolsValidator()
    return await validator.validatePermissions()
  }
}

// 导出类型定义
export type {
  ValidationIssue,
  ValidationLevel,
  ValidationResult
} from "./types"
export { DevToolsValidator } from "./validator"
