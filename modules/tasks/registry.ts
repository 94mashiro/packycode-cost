/**
 * 数据获取任务注册表 (强类型约束版)
 *
 * 目的：统一管理所有数据获取任务，确保 alarm 轮询、手动刷新、background 消息处理
 * 都使用同一份任务配置，通过枚举避免字符串字面量逃过类型检查
 *
 * Linus: "单一数据源，一处定义，处处生效"
 * Dan: "好的抽象应该以功能命名，而不是以使用方式命名"
 */

import { loggers } from "~/lib/logger"
import { fetchPeerSpendingToday } from "~/modules/peerSpending"
import { checkAndNotifyPurchaseStatus } from "~/modules/purchase/checker"
import { fetchPrivateOpusStatus } from "~/modules/sharedSpace"
import { fetchSubscriptionInfo } from "~/modules/subscription"
import { fetchUserInfo } from "~/modules/user"

const logger = loggers.ui

// 1. 其他 background action 枚举
export enum BackgroundActionEnum {
  GET_STORED_TOKEN = "getStoredToken"
}

// 2. 数据获取任务类型枚举
export enum DataTaskType {
  CHECK_PURCHASE_STATUS = "checkPurchaseStatus",
  FETCH_PEER_SPENDING = "fetchPeerSpending",
  FETCH_PRIVATE_OPUS_STATUS = "fetchPrivateOpusStatus",
  FETCH_SUBSCRIPTION_INFO = "fetchSubscriptionInfo",
  FETCH_USER_INFO = "fetchUserInfo"
}

export type BackgroundAction = `${BackgroundActionEnum}` | DataTaskAction
// 3. 组合所有 action 类型
export type DataTaskAction = `${DataTaskType}`

// 4. 任务定义的强类型结构
interface TaskDefinition {
  readonly description: string // 任务描述
  readonly handler: () => Promise<unknown> // 任务执行函数
  readonly priority: number // 执行优先级
  readonly type: DataTaskType // 任务类型标识
}

// 5. 任务注册表：统一配置所有数据获取任务
export const TASK_REGISTRY: Record<DataTaskType, TaskDefinition> = {
  [DataTaskType.CHECK_PURCHASE_STATUS]: {
    description: "检查购买状态和系统配置",
    handler: checkAndNotifyPurchaseStatus,
    priority: 2,
    type: DataTaskType.CHECK_PURCHASE_STATUS
  },
  [DataTaskType.FETCH_PEER_SPENDING]: {
    description: "获取同行消费数据（仅滴滴车模式）",
    handler: fetchPeerSpendingToday,
    priority: 5, // 最低优先级，在其他任务之后执行
    type: DataTaskType.FETCH_PEER_SPENDING
  },
  [DataTaskType.FETCH_PRIVATE_OPUS_STATUS]: {
    description: "获取滴滴车模式 Opus 状态",
    handler: fetchPrivateOpusStatus,
    priority: 4,
    type: DataTaskType.FETCH_PRIVATE_OPUS_STATUS
  },
  [DataTaskType.FETCH_SUBSCRIPTION_INFO]: {
    description: "获取用户订阅状态和计划信息",
    handler: fetchSubscriptionInfo,
    priority: 3,
    type: DataTaskType.FETCH_SUBSCRIPTION_INFO
  },
  [DataTaskType.FETCH_USER_INFO]: {
    description: "获取用户预算和使用量信息",
    handler: fetchUserInfo,
    priority: 1,
    type: DataTaskType.FETCH_USER_INFO
  }
  // 新增任务类型时，TypeScript 会强制要求在这里添加对应配置
} as const

// 6. 编译时完整性验证：确保所有任务类型都有对应的定义
type TaskCompleteness = {
  [K in DataTaskType]: TaskDefinition
}
// 如果 TASK_REGISTRY 缺少任何任务类型，这里会编译失败
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _completenessCheck: TaskCompleteness = TASK_REGISTRY

/**
 * 执行所有数据获取任务
 */
export async function executeAllTasks(): Promise<{
  results: Array<{ error?: string; success: boolean; task: DataTaskType }>
  success: boolean
}> {
  logger.info("🔄 执行所有数据获取任务...")

  // 按优先级排序执行任务
  const sortedTaskTypes = Object.values(DataTaskType).sort(
    (a, b) => TASK_REGISTRY[a].priority - TASK_REGISTRY[b].priority
  )

  const results = await Promise.allSettled(
    sortedTaskTypes.map(async (taskType) => {
      const result = await executeTask(taskType)
      return { task: taskType, ...result }
    })
  )

  const finalResults = results.map((result) =>
    result.status === "fulfilled"
      ? result.value
      : {
          error: result.reason,
          success: false,
          task: DataTaskType.FETCH_USER_INFO // fallback，但实际不会到这里
        }
  )

  const successCount = finalResults.filter((r) => r.success).length
  const success = successCount === sortedTaskTypes.length

  logger.info(`📊 任务执行完成: ${successCount}/${sortedTaskTypes.length} 成功`)

  return { results: finalResults, success }
}

/**
 * 执行单个数据获取任务 (类型安全版)
 */
export async function executeTask(taskType: DataTaskType): Promise<{
  error?: string
  success: boolean
}> {
  const task = TASK_REGISTRY[taskType] // 从任务注册表获取任务定义

  try {
    logger.debug(`执行任务 ${task.type}: ${task.description}`)
    await task.handler()
    logger.debug(`✅ ${task.type} 执行成功`)
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    logger.error(`❌ ${task.type} 执行失败:`, errorMsg)
    return { error: errorMsg, success: false }
  }
}

/**
 * 通过任务标识字符串执行对应的数据获取任务 (类型安全版)
 *
 * 用于 background 消息处理，将字符串映射回任务类型枚举
 */
export async function executeTaskByAction(action: DataTaskAction): Promise<{
  error?: string
  success: boolean
}> {
  // 反向查找对应的任务类型枚举 (类型安全)
  const taskType = Object.values(DataTaskType).find(
    (enumValue) => enumValue === action
  ) as DataTaskType | undefined

  if (!taskType) {
    return { error: `未知的数据获取任务: ${action}`, success: false }
  }

  return executeTask(taskType)
}

/**
 * 获取所有数据获取任务的信息（类型安全版）
 */
export function getTasksInfo() {
  return Object.values(DataTaskType)
    .map((taskType) => ({
      description: TASK_REGISTRY[taskType].description,
      priority: TASK_REGISTRY[taskType].priority,
      type: taskType
    }))
    .sort((a, b) => a.priority - b.priority)
}

/**
 * 验证 action 是否为有效的 background action (类型守卫)
 */
export function isBackgroundAction(action: string): action is BackgroundAction {
  return (
    Object.values(BackgroundActionEnum).includes(
      action as BackgroundActionEnum
    ) || isDataTaskAction(action)
  )
}

/**
 * 验证 action 是否为有效的数据获取任务 (类型守卫)
 */
export function isDataTaskAction(action: string): action is DataTaskAction {
  return Object.values(DataTaskType).includes(action as DataTaskType)
}
