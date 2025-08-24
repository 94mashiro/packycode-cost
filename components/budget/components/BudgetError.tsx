/**
 * 预算错误显示组件
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "错误处理要简单直接，不增加系统复杂度"
 * ⚛️ Dan: "提供清晰的错误反馈，帮助用户理解问题"
 * ☕ Bloch: "错误信息要准确，API设计要直观"
 * 🏛️ Fowler: "错误展示要符合整体设计语言"
 */

interface BudgetErrorProps {
  error: string
}

export function BudgetError({ error }: BudgetErrorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          预算使用情况
        </h3>
      </div>
      <div className="bg-red-50/40 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/50 rounded-lg p-3">
        <p className="text-sm text-red-800 dark:text-red-200">
          加载失败: {error}
        </p>
      </div>
    </div>
  )
}
