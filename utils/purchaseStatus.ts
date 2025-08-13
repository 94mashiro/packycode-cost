import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export interface PackyConfig {
  anthropicBaseUrl: string
  purchaseDisabled: boolean
  purchaseUrl: string
  supportEmail: string
}

export async function checkPurchaseStatusChange(): Promise<boolean> {
  try {
    // 直接从storage获取当前和之前的配置，而不是重新fetch API
    const currentConfig = await storage.get<PackyConfig>("packy_config")
    if (!currentConfig) {
      return false
    }

    const previousConfig = await storage.get<PackyConfig>(
      "packy_config_previous"
    )

    // 如果是首次检查，不触发通知
    if (!previousConfig) {
      console.log("First check, no notification")
      return false
    }

    // 检查购买状态是否从禁用变为开放
    const statusChanged =
      previousConfig.purchaseDisabled && !currentConfig.purchaseDisabled

    if (statusChanged) {
      console.log("Purchase status changed: now available for purchase!")
    } else {
      console.log(
        `Status check: previous=${previousConfig.purchaseDisabled}, current=${currentConfig.purchaseDisabled}, changed=${statusChanged}`
      )
    }

    return statusChanged
  } catch (error) {
    console.error("Failed to check purchase status change:", error)
    return false
  }
}

export async function fetchPurchaseStatus(): Promise<null | PackyConfig> {
  try {
    console.log(
      "[API] Fetching purchase status from:",
      "https://www.packycode.com/api/config"
    )

    const response = await fetch("https://www.packycode.com/api/config", {
      headers: {
        "Content-Type": "application/json"
      },
      method: "GET"
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const config: PackyConfig = await response.json()
    console.log("[API] Purchase status fetched:", {
      purchaseDisabled: config.purchaseDisabled
    })

    // 缓存当前状态
    await storage.set("packy_config", config)
    await storage.set("packy_config_timestamp", Date.now())

    return config
  } catch (error) {
    console.error("Failed to fetch purchase status:", error)
    return null
  }
}
