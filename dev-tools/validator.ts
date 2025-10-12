/**
 * 开发工具验证器
 * 实现依赖注入架构，避免与业务代码紧耦合
 * 遵循四师共识：简单但正确的设计
 */

import type { ApiConfigManager } from "~/api/config"
import type { loggers } from "~/lib/logger"
import type { MultiAccountStorageManager } from "~/lib/storage/MultiAccountStorageManager"

import {
  type ValidationIssue,
  ValidationLevel,
  type ValidationResult,
  type ValidatorConfig
} from "./types"

/**
 * DevTools 验证器依赖接口
 * 通过依赖注入避免直接导入业务模块
 */
export interface DevToolsDependencies {
  apiConfigManager: ApiConfigManager
  logger: typeof loggers.debug
  storage: MultiAccountStorageManager
}

/**
 * 开发工具验证器主类
 * 统一管理所有验证功能
 */
export class DevToolsValidator {
  private readonly deps: DevToolsDependencies

  constructor(dependencies: DevToolsDependencies) {
    this.deps = dependencies
  }

  /**
   * 获取验证器配置信息
   */
  getValidatorConfigs(): ValidatorConfig[] {
    return [
      {
        description: "验证API基础配置和账号类型",
        enabled: true,
        id: "api-config",
        name: "API配置验证"
      },
      {
        description: "验证Chrome扩展权限配置",
        enabled: true,
        id: "permissions",
        name: "权限验证"
      },
      {
        description: "验证账号类型切换功能",
        enabled: true,
        id: "account-switching",
        name: "账号切换验证"
      }
    ]
  }

  /**
   * 运行所有验证
   */
  async runAllValidations(): Promise<ValidationResult[]> {
    this.deps.logger.info("🚀 开始完整验证...")

    const results = await Promise.all([
      this.validateApiConfiguration(),
      this.validatePermissions(),
      this.validateAccountSwitching()
    ])

    const allSuccess = results.every((r) => r.success)
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0)

    this.deps.logger.info(
      allSuccess ? "✅ 所有验证通过" : `⚠️ 发现 ${totalIssues} 个问题`
    )

    return results
  }

  /**
   * 验证账号切换功能
   */
  async validateAccountSwitching(): Promise<ValidationResult> {
    const validatorId = "account-switching"

    try {
      this.deps.logger.info("🔄 验证账号切换功能...")

      // 验证 URL 有效性
      const currentBaseUrl = this.deps.apiConfigManager.getBaseUrl()
      const issues: ValidationIssue[] = []

      // 验证URL环境感知
      const isPrivateDomain = currentBaseUrl.includes("share.packycode.com")
      const isSharedDomain = currentBaseUrl.includes("www.packycode.com")
      const isCodexDomain = currentBaseUrl.includes("codex.packycode.com")

      if (!isPrivateDomain && !isSharedDomain && !isCodexDomain) {
        issues.push(
          this.createIssue(
            ValidationLevel.WARNING,
            `未识别的域名: ${currentBaseUrl}`,
            "请确认这是有效的 PackyCode 环境"
          )
        )
      }

      const success =
        issues.filter((i) => i.level === ValidationLevel.ERROR).length === 0

      return this.createResult(
        validatorId,
        success,
        success ? "账号切换功能正常" : "账号切换配置存在问题",
        issues
      )
    } catch (error) {
      return this.createResult(
        validatorId,
        false,
        `账号切换验证异常: ${error instanceof Error ? error.message : String(error)}`,
        [
          this.createIssue(
            ValidationLevel.ERROR,
            error instanceof Error ? error.message : String(error)
          )
        ]
      )
    }
  }

  /**
   * 验证 API 配置
   */
  async validateApiConfiguration(): Promise<ValidationResult> {
    const validatorId = "api-config"

    try {
      this.deps.logger.info("🔍 验证API配置...")

      const baseUrl = this.deps.apiConfigManager.getBaseUrl()
      const issues: ValidationIssue[] = []

      // 验证基础URL格式
      try {
        new URL(baseUrl)
      } catch {
        issues.push(
          this.createIssue(
            ValidationLevel.ERROR,
            `无效的基础URL: ${baseUrl}`,
            "请检查账号配置"
          )
        )
      }

      const success =
        issues.filter((i) => i.level === ValidationLevel.ERROR).length === 0

      this.deps.logger.info(`API配置验证${success ? "通过" : "失败"}`)

      return this.createResult(
        validatorId,
        success,
        success ? "API配置验证通过" : "API配置存在问题",
        issues
      )
    } catch (error) {
      this.deps.logger.error("API配置验证失败:", error)

      return this.createResult(
        validatorId,
        false,
        `API配置验证异常: ${error instanceof Error ? error.message : String(error)}`,
        [
          this.createIssue(
            ValidationLevel.ERROR,
            error instanceof Error ? error.message : String(error)
          )
        ]
      )
    }
  }

  /**
   * 验证权限设置
   */
  async validatePermissions(): Promise<ValidationResult> {
    const validatorId = "permissions"
    const issues: ValidationIssue[] = []

    try {
      this.deps.logger.info("🔐 验证权限设置...")

      // 验证 Chrome API 权限
      if (!chrome.cookies) {
        issues.push(
          this.createIssue(
            ValidationLevel.ERROR,
            "缺少 cookies 权限",
            "请在 manifest.json 中添加 'cookies' 权限"
          )
        )
      }

      if (!chrome.storage) {
        issues.push(
          this.createIssue(
            ValidationLevel.ERROR,
            "缺少 storage 权限",
            "请在 manifest.json 中添加 'storage' 权限"
          )
        )
      }

      // 测试网络访问权限
      try {
        const baseUrl = this.deps.apiConfigManager.getBaseUrl()
        const response = await fetch(`${baseUrl}/api/config`, {
          method: "HEAD"
        })

        if (response.status === 0) {
          issues.push(
            this.createIssue(
              ValidationLevel.ERROR,
              "网络请求被阻止",
              `请检查 host_permissions 是否包含 ${baseUrl}`
            )
          )
        }
      } catch (error) {
        issues.push(
          this.createIssue(
            ValidationLevel.WARNING,
            `网络请求测试失败: ${String(error)}`,
            "这可能是网络问题或权限问题"
          )
        )
      }

      const success =
        issues.filter((i) => i.level === ValidationLevel.ERROR).length === 0

      return this.createResult(
        validatorId,
        success,
        success ? "权限验证通过" : "权限配置存在问题",
        issues
      )
    } catch (error) {
      return this.createResult(
        validatorId,
        false,
        `权限验证异常: ${error instanceof Error ? error.message : String(error)}`,
        [
          this.createIssue(
            ValidationLevel.ERROR,
            error instanceof Error ? error.message : String(error)
          )
        ]
      )
    }
  }

  /**
   * 创建验证问题
   */
  private createIssue(
    level: ValidationLevel,
    message: string,
    suggestion?: string
  ): ValidationIssue {
    return { level, message, suggestion }
  }

  /**
   * 创建标准验证结果
   */
  private createResult(
    validatorId: string,
    success: boolean,
    summary: string,
    issues: ValidationIssue[] = []
  ): ValidationResult {
    return {
      issues,
      success,
      summary,
      timestamp: new Date(),
      validatorId
    }
  }
}
