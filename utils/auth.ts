import { Storage } from "@plasmohq/storage"

const storage = new Storage()

export async function clearPluginTokenOnly() {
  try {
    await storage.remove("packy_token")
    await storage.remove("packy_token_timestamp")
    await storage.remove("packy_token_type")

    await storage.remove("cached_user_info")

    return true
  } catch {
    return false
  }
}
