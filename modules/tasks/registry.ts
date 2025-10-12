/**
 * 数据获取任务注册表 (强类型约束版)
 *
 * 目的：统一管理所有数据获取任务，确保 alarm 轮询、手动刷新、background 消息处理
 * 都使用同一份任务配置，通过枚举避免字符串字面量逃过类型检查
 *
 * Linus: "单一数据源，一处定义，处处生效"
 * Dan: "好的抽象应该以功能命名，而不是以使用方式命名"
 */

import { AccountManager } from "~/lib/account"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { fetchPeerSpendingToday } from "~/modules/peerSpending"
import { checkAndNotifyPurchaseStatus } from "~/modules/purchase/status"
import { fetchPrivateOpusStatus } from "~/modules/sharedSpace"
import { fetchSubscriptionInfo } from "~/modules/subscription"
import { fetchUserInfo } from "~/modules/user"
import { PackySite } from "~/types/account"

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
  readonly applicableSites: PackySite[] // 适用站点列表
  readonly description: string // 任务描述
  readonly handler: (context: import("~/types").AccountContext) => Promise<unknown> // 任务执行函数（接收完整账号上下文）
  readonly priority: number // 执行优先级
  readonly type: DataTaskType // 任务类型标识
}

// 5. 任务注册表：统一配置所有数据获取任务
export const TASK_REGISTRY: Record<DataTaskType, TaskDefinition> = {
  [DataTaskType.CHECK_PURCHASE_STATUS]: {
    applicableSites: [PackySite.WWW, PackySite.SHARED, PackySite.CODEX], // 所有站点
    description: "检查购买状态和系统配置",
    handler: checkAndNotifyPurchaseStatus,
    priority: 2,
    type: DataTaskType.CHECK_PURCHASE_STATUS
  },
  [DataTaskType.FETCH_PEER_SPENDING]: {
    applicableSites: [PackySite.SHARED], // 仅滴滴车
    description: "获取同行消费数据（仅滴滴车模式）",
    handler: fetchPeerSpendingToday,
    priority: 5, // 最低优先级，在其他任务之后执行
    type: DataTaskType.FETCH_PEER_SPENDING
  },
  [DataTaskType.FETCH_PRIVATE_OPUS_STATUS]: {
    applicableSites: [PackySite.SHARED], // 仅滴滴车
    description: "获取滴滴车模式 Opus 状态",
    handler: fetchPrivateOpusStatus,
    priority: 4,
    type: DataTaskType.FETCH_PRIVATE_OPUS_STATUS
  },
  [DataTaskType.FETCH_SUBSCRIPTION_INFO]: {
    applicableSites: [PackySite.SHARED, PackySite.CODEX], // 仅滴滴车和Codex
    description: "获取用户订阅状态和计划信息",
    handler: fetchSubscriptionInfo,
    priority: 3,
    type: DataTaskType.FETCH_SUBSCRIPTION_INFO
  },
  [DataTaskType.FETCH_USER_INFO]: {
    applicableSites: [PackySite.WWW, PackySite.SHARED, PackySite.CODEX], // 所有站点
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
 * 执行所有数据获取任务（多账号并行版本）
 *
 * 为所有账号并行执行数据获取任务，每个账号根据其 site 执行对应的任务子集
 */
export async function executeAllTasks(): Promise<{
  results: Array<{
    accountId: string
    error?: string
    success: boolean
    taskCount: number
  }>
  success: boolean
}> {
  const storageManager = getStorageManager()
  const accountManager = new AccountManager(storageManager)

  // 获取所有账号
  const accounts = await accountManager.getAllAccounts()
  logger.info(`🚀 多账号并行同步: 共 ${accounts.length} 个账号`)

  if (accounts.length === 0) {
    logger.warn("⚠️ 没有账号，跳过数据获取")
    return { results: [], success: true }
  }

  // 并行执行每个账号的任务（不切换全局状态）
  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      return await executeTasksForAccount(account.id, account.site)
    })
  )

  // 汇总结果
  const finalResults = results.map((r, i) => {
    if (r.status === "fulfilled") {
      return {
        accountId: accounts[i].id,
        error: r.value.error,
        success: r.value.success,
        taskCount: r.value.taskCount
      }
    } else {
      return {
        accountId: accounts[i].id,
        error: r.reason instanceof Error ? r.reason.message : "Unknown error",
        success: false,
        taskCount: 0
      }
    }
  })

  const successCount = finalResults.filter((r) => r.success).length
  const allSuccess = successCount === accounts.length

  logger.info(`📊 多账号同步完成: ${successCount}/${accounts.length} 成功`)

  return {
    results: finalResults,
    success: allSuccess
  }
}

/**
 * 执行单个数据获取任务 (类型安全版)
 * @param taskType 任务类型
 * @param context 账号执行上下文（包含完整的账号信息）
 */
export async function executeTask(
  taskType: DataTaskType,
  context: import("~/types").AccountContext
): Promise<{
  error?: string
  success: boolean
}> {
  const task = TASK_REGISTRY[taskType] // 从任务注册表获取任务定义

  try {
    logger.debug(`执行任务 ${task.type}: ${task.description}`)
    await task.handler(context) // 传递完整上下文
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
 * 用于 background 消息处理，将字符串映射回任务类型枚举。
 * 默认使用当前激活账号构建执行上下文。
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

  try {
    // 构建当前账号的执行上下文
    const storageManager = getStorageManager()
    const accountManager = new AccountManager(storageManager)
    const currentAccount = await accountManager.getCurrentAccount()

    if (!currentAccount) {
      return { error: "No active account", success: false }
    }

    const authData = await storageManager.get<import("~/types").AuthStorage>(
      import("~/lib/storage/domains").StorageDomain.AUTH
    )

    if (!authData) {
      return { error: "No authentication data", success: false }
    }

    const context: import("~/types").AccountContext = {
      accountId: currentAccount.id,
      site: currentAccount.site,
      authData,
      timestamp: Date.now()
    }

    return executeTask(taskType, context)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    return { error: errorMsg, success: false }
  }
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

/**
 * 为单个账号执行任务（私有函数）
 *
 * 核心改进 (v3.6.0):
 * - 在此处一次性构建完整的 AccountContext
 * - 传递完整上下文给所有任务，消除隐式查询
 * - 确保站点和 token 完美匹配
 *
 * @param accountId 账号ID
 * @param site 账号站点
 */
async function executeTasksForAccount(
  accountId: string,
  site: PackySite
): Promise<{ error?: string; success: boolean; taskCount: number }> {
  logger.info(`📍 账号 ${accountId} (${site}) 开始执行任务`)

  try {
    // 🔑 核心改进：在此处一次性构建完整的账号上下文
    const storageManager = getStorageManager()
    const authData = await storageManager.getForAccount<import("~/types").AuthStorage>(
      accountId,
      import("~/lib/storage/domains").StorageDomain.AUTH
    )

    if (!authData) {
      logger.warn(`⚠️ 账号 ${accountId} 无认证数据，跳过任务执行`)
      return { error: "No authentication data", success: false, taskCount: 0 }
    }

    // 构建完整的执行上下文
    const context: import("~/types").AccountContext = {
      accountId,
      site,
      authData,
      timestamp: Date.now()
    }

    logger.debug(`✅ 账号上下文已构建: ${accountId} @ ${site}`)

    // 1. 根据站点过滤适用的任务
    const applicableTasks = Object.values(DataTaskType).filter((taskType) => {
      return TASK_REGISTRY[taskType].applicableSites.includes(site)
    })

    logger.info(`  🎯 适用任务: ${applicableTasks.length} 个`)

    if (applicableTasks.length === 0) {
      logger.info(`  ⏭️  账号 ${accountId} 无适用任务，跳过`)
      return { success: true, taskCount: 0 }
    }

    // 2. 按优先级排序
    const sortedTasks = applicableTasks.sort(
      (a, b) => TASK_REGISTRY[a].priority - TASK_REGISTRY[b].priority
    )

    // 3. 执行任务（传入完整上下文，无需切换全局状态）
    const results = await Promise.allSettled(
      sortedTasks.map(async (taskType) => {
        return await executeTask(taskType, context) // ✅ 传递完整上下文
      })
    )

    // 4. 统计成功数
    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length
    const allSuccess = successCount === sortedTasks.length

    // 5. 收集错误信息
    const errors = results
      .map((r, i) => {
        if (r.status === "rejected") {
          return `${sortedTasks[i]}: ${r.reason}`
        } else if (!r.value.success) {
          return `${sortedTasks[i]}: ${r.value.error}`
        }
        return null
      })
      .filter((e) => e !== null)

    logger.info(
      `  ${allSuccess ? "✅" : "⚠️"} 账号 ${accountId}: ${successCount}/${sortedTasks.length} 成功`
    )

    return {
      error: errors.length > 0 ? errors.join("; ") : undefined,
      success: allSuccess,
      taskCount: sortedTasks.length
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    logger.error(`  ❌ 账号 ${accountId} 执行失败:`, errorMsg)
    return {
      error: errorMsg,
      success: false,
      taskCount: 0
    }
  }
}
