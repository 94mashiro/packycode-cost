/**
 * 开发工具统一类型定义
 * 遵循四师共识：统一接口设计，类型安全，面向未来扩展
 */

/**
 * 验证问题等级
 */
export enum ValidationLevel {
  ERROR = "error",
  INFO = "info",
  WARNING = "warning"
}

/**
 * 验证问题详情
 */
export interface ValidationIssue {
  /** 问题等级 */
  level: ValidationLevel
  /** 问题描述 */
  message: string
  /** 修复建议（可选） */
  suggestion?: string
}

/**
 * 验证结果统一格式
 * 替换现有的各种不一致的返回类型
 */
export interface ValidationResult {
  /** 问题详情列表 */
  issues: ValidationIssue[]
  /** 验证是否成功 */
  success: boolean
  /** 结果概要 */
  summary: string
  /** 验证时间戳 */
  timestamp: Date
  /** 验证器标识 */
  validatorId: string
}

/**
 * 验证器函数类型定义
 * 支持同步和异步验证
 */
export type Validator<TInput = void> = (
  input?: TInput
) => Promise<ValidationResult> | ValidationResult

/**
 * 验证器配置
 */
export interface ValidatorConfig {
  /** 描述 */
  description: string
  /** 是否默认启用 */
  enabled: boolean
  /** 验证器ID */
  id: string
  /** 验证器名称 */
  name: string
}
