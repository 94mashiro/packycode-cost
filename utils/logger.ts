/**
 * 统一日志管理模块
 *
 * 设计原则：
 * 1. 模块化 - 每个模块有自己的命名空间
 * 2. 级别控制 - 支持 debug, info, warn, error
 * 3. 环境感知 - 生产环境自动静默
 * 4. 格式统一 - 一致的输出格式
 */

export enum LogLevel {
  DEBUG = 0,
  ERROR = 3,
  INFO = 1,
  NONE = 4,
  WARN = 2
}
export interface LoggerConfig {
  color?: string
  enabled?: boolean
  level?: LogLevel
  prefix?: string
}

// 日志参数类型 - 使用 unknown 以支持任何值，但保持类型安全
type LogArgs = unknown[]

class Logger {
  private static globalLevel: LogLevel = LogLevel.INFO
  private static isProduction: boolean = false // Chrome 扩展环境没有 process.env
  private config: LoggerConfig
  private namespace: string

  constructor(namespace: string, config: LoggerConfig = {}) {
    this.namespace = namespace
    this.config = {
      color: config.color,
      enabled: config.enabled ?? !Logger.isProduction,
      level: config.level ?? Logger.globalLevel,
      prefix: config.prefix ?? `[${namespace}]`
    }
  }

  /**
   * 设置全局日志级别
   */
  static setGlobalLevel(level: LogLevel) {
    Logger.globalLevel = level
  }

  /**
   * 条件日志
   */
  assert(condition: boolean, ...args: LogArgs): void {
    if (!condition) {
      this.error("Assertion failed:", ...args)
    }
  }

  /**
   * 创建子日志器
   */
  createChild(subNamespace: string): Logger {
    return new Logger(`${this.namespace}:${subNamespace}`, this.config)
  }

  debug(...args: LogArgs): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(...this.formatMessage("DEBUG", ...args))
    }
  }

  error(...args: LogArgs): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(...this.formatMessage("ERROR", ...args))
    }
  }

  /**
   * 分组日志
   */
  group(label: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(`${this.config.prefix} ${label}`)
    }
  }

  groupEnd() {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd()
    }
  }

  info(...args: LogArgs): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(...this.formatMessage("INFO", ...args))
    }
  }

  /**
   * 性能计时
   */
  time(label: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(`${this.config.prefix} ${label}`)
    }
  }

  timeEnd(label: string) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(`${this.config.prefix} ${label}`)
    }
  }

  warn(...args: LogArgs): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(...this.formatMessage("WARN", ...args))
    }
  }

  /**
   * 格式化消息
   */
  private formatMessage(level: string, ...args: LogArgs): unknown[] {
    const [, timeStr] = new Date().toISOString().split("T")
    const [time] = timeStr.split(".")
    const prefix = `${time} ${this.config.prefix} ${level}`

    if (this.config.color && typeof args[0] === "string") {
      return [
        `%c${prefix}%c ${args[0]}`,
        `color: ${this.config.color}; font-weight: bold`,
        "color: inherit",
        ...args.slice(1)
      ]
    }

    return [prefix, ...args]
  }

  /**
   * 检查是否应该输出日志
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false
    return level >= (this.config.level ?? Logger.globalLevel)
  }
}

/**
 * 预定义的日志器实例
 */
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

/**
 * 创建自定义日志器
 */
export function createLogger(namespace: string, config?: LoggerConfig): Logger {
  return new Logger(namespace, config)
}

/**
 * 默认导出
 */
export default Logger
