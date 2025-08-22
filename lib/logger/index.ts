/**
 * 统一的日志模块
 *
 * Linus: "一个文件搞定核心逻辑"
 * Dan: "清晰的 API，隐藏实现细节"
 */

export interface LoggerConfig {
  color?: string
  enabled?: boolean
  level?: LogLevel
}

// ============= 类型定义 =============
export type LogLevel = "debug" | "error" | "info" | "warn"

// ============= 核心 Logger 类 =============
class Logger {
  private config: LoggerConfig
  private namespace: string

  constructor(namespace: string, config: LoggerConfig = {}) {
    this.namespace = namespace
    this.config = {
      color: config.color,
      enabled: process.env.NODE_ENV !== "production",
      level: config.level || "info"
    }
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      // eslint-disable-next-line no-console
      console.log(...this.format("DEBUG", ...args))
      this.sendToPopup("debug", args)
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog("error")) {
      console.error(...this.format("ERROR", ...args))
      this.sendToPopup("error", args)
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog("info")) {
      // eslint-disable-next-line no-console
      console.log(...this.format("INFO", ...args))
      this.sendToPopup("info", args)
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      console.warn(...this.format("WARN", ...args))
      this.sendToPopup("warn", args)
    }
  }

  private format(level: string, ...args: unknown[]): unknown[] {
    const time = new Date().toLocaleTimeString()
    return [`[${time}] [${this.namespace}] ${level}:`, ...args]
  }

  // Service Worker -> Popup 通信
  private sendToPopup(level: LogLevel, args: unknown[]): void {
    // 只在 Service Worker 环境发送
    if (typeof globalThis.ServiceWorkerGlobalScope === "undefined") return

    chrome.runtime
      .sendMessage({
        args,
        level,
        namespace: this.namespace,
        timestamp: Date.now(),
        type: "CONSOLE_LOG"
      })
      .catch(() => {
        // 静默失败 - Popup 可能未打开
      })
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false
    const levels = ["debug", "info", "warn", "error"]
    const configLevel = this.config.level || "info"
    return levels.indexOf(level) >= levels.indexOf(configLevel)
  }
}

// ============= 预定义实例 =============
export const loggers = {
  alarm: new Logger("ALARM", { color: "#795548" }),
  api: new Logger("API", { color: "#2196F3" }),
  auth: new Logger("AUTH", { color: "#4CAF50" }),
  background: new Logger("BACKGROUND", { color: "#9C27B0" }),
  notification: new Logger("NOTIFICATION", { color: "#607D8B" }),
  purchase: new Logger("PURCHASE", { color: "#F44336" }),
  storage: new Logger("STORAGE", { color: "#FF9800" }),
  ui: new Logger("UI", { color: "#00BCD4" })
}

// ============= 工具函数 =============
export function createLogger(namespace: string, config?: LoggerConfig): Logger {
  return new Logger(namespace, config)
}

// ============= Popup 端接收器 =============
export function enablePopupLogging(): void {
  // 只在 Popup 环境启用
  if (process.env.NODE_ENV === "production") return
  if (typeof chrome === "undefined" || !chrome.runtime) return

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "CONSOLE_LOG") return

    const { args, level, namespace } = message

    // 选择合适的 console 方法
    const method =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : // eslint-disable-next-line no-console
            console.log

    // 带样式输出
    const colors = {
      debug: "#607D8B",
      error: "#F44336",
      info: "#2196F3",
      warn: "#FF9800"
    }

    method(
      `%c[${namespace}]%c ${level.toUpperCase()}`,
      "color: #9C27B0; font-weight: bold",
      `color: ${colors[level]}; font-weight: bold`,
      ...args
    )
  })

  // eslint-disable-next-line no-console
  console.log(
    "%c[Logger] Popup 日志接收已启用",
    "color: #4CAF50; font-weight: bold"
  )
}

// 默认导出
export default Logger
