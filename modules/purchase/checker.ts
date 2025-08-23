/**
 * 触发后台检查购买状态
 */
export const checkPurchaseStatus = async (): Promise<void> => {
  chrome.runtime.sendMessage({ action: "checkPurchaseStatus" })
}

/**
 * 检查并通知购买状态
 */
export const checkAndNotifyPurchaseStatus = checkPurchaseStatus
