/**
 * 订阅模块统一导出
 */

export { fetchSubscriptionInfo } from "./api"

// 主要导出 - 供任务注册表使用
export { fetchSubscriptionInfo as default } from "./api"
