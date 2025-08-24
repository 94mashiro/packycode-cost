/**
 * PeerSpendingChart 常量定义
 *
 * 设计原则：
 * 🐧 Linus: "消除魔法数字，提高代码可维护性"
 * ☕ Bloch: "常量应该有清晰的命名和组织结构"
 */

// 排名等级枚举
export enum RankLevel {
  FIFTH = 5,
  FIRST = 1,
  FOURTH = 4,
  SECOND = 2,
  SIXTH = 6,
  THIRD = 3
}

// 默认值常量
export const DEFAULT_VALUES = {
  MAX_DISPLAY_COUNT: 5,
  ZERO_AMOUNT: "0.00"
} as const

// 排名配色方案 - 参考专业数据可视化工具
export const RANK_COLOR_SCHEME = {
  DEFAULT: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-700",
    gradient: "bg-gradient-to-r from-blue-500 to-indigo-500"
  },
  [RankLevel.FIFTH]: {
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300",
    border: "border-cyan-200 dark:border-cyan-700",
    gradient: "bg-gradient-to-r from-cyan-500 to-sky-500"
  },
  [RankLevel.FIRST]: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-700",
    gradient: "bg-gradient-to-r from-rose-500 to-pink-500"
  },
  [RankLevel.FOURTH]: {
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-700",
    gradient: "bg-gradient-to-r from-emerald-500 to-teal-500"
  },
  [RankLevel.SECOND]: {
    badge:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-700",
    gradient: "bg-gradient-to-r from-orange-500 to-amber-500"
  },
  [RankLevel.THIRD]: {
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-700",
    gradient: "bg-gradient-to-r from-amber-500 to-yellow-500"
  }
} as const

// 样式常量
export const STYLES = {
  CURRENT_USER_CONTAINER:
    "relative bg-white dark:bg-gray-900 shadow-md ring-1 ring-gray-200 dark:ring-gray-700 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:rounded-l-lg before:bg-gradient-to-b before:from-indigo-500 before:to-purple-500",
  CURRENT_USER_HIGHLIGHT: "shadow-sm border",
  CURRENT_USER_INDICATOR:
    "absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full animate-pulse",
  HOVER_EFFECT: "hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm"
} as const
