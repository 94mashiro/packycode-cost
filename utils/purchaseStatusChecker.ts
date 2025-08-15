/**
 * 触发后台检查购买状态
 */
export const checkPurchaseStatus = () => {
  chrome.runtime.sendMessage({ action: "checkPurchaseStatus" })
}
