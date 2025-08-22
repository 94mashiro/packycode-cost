/**
 * 数据获取任务执行器 (简化版)
 *
 * 直接使用任务注册表中的配置，确保与 background alarm 行为完全一致
 *
 * Linus: "一个函数，一个目的"
 * Dan: "简单的抽象是最好的抽象"
 */

import { executeAllTasks } from "./taskRegistry"

/**
 * 执行所有数据获取任务
 *
 * 直接调用任务注册表中的统一执行机制
 */
export async function fetchAllData() {
  return await executeAllTasks()
}

/**
 * 异步执行所有数据获取任务（不等待结果）
 */
export async function fetchAllDataAsync(): Promise<void> {
  try {
    await executeAllTasks()
  } catch (error) {
    console.error("💥 异步数据获取失败:", error)
  }
}
