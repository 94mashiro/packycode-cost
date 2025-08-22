/**
 * 任务系统模块
 *
 * Linus: "任务调度必须是确定性的"
 * Dan: "任务执行应该是可观察的"
 */

export * from "./executor"
// 主要导出
export { fetchAllDataAsync } from "./executor"

export * from "./registry"
export { DataTaskType, executeAllTasks } from "./registry"
