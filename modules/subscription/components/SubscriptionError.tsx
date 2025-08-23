interface SubscriptionErrorProps {
  error: string
}

/**
 * 订阅信息错误组件
 *
 * 职责：显示订阅信息加载失败的错误状态
 * 设计：用户友好的错误提示，与现有错误样式保持一致
 */
export function SubscriptionError({ error }: SubscriptionErrorProps) {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
      <p className="text-sm text-yellow-800 dark:text-yellow-200">
        套餐信息加载失败: {error}
      </p>
    </div>
  )
}
