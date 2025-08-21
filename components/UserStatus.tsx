import { type TokenData, type TokenExpiration, TokenType } from "../types"

interface UserStatusProps {
  tokenData: TokenData
  tokenExpiration: TokenExpiration
}

export function UserStatus({ tokenData, tokenExpiration }: UserStatusProps) {
  const isApiKey = tokenData.tokenType === TokenType.API_KEY

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">用户状态</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tokenData.isValid
              ? isApiKey
                ? "API Key 认证"
                : "JWT 认证"
              : "未认证"}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className={`h-2 w-2 rounded-full ${
              tokenData.isValid && (isApiKey || !tokenExpiration.isExpired)
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {/* 仅JWT token显示过期时间 */}
        {tokenData.isValid && !isApiKey && (
          <p
            className={`text-xs ${
              tokenExpiration.isExpired
                ? "text-red-600 dark:text-red-400"
                : "text-gray-600 dark:text-gray-400"
            }`}>
            过期时间: {tokenExpiration.formatted}
          </p>
        )}

        {/* JWT 认证提示 */}
        {tokenData.isValid && !isApiKey && (
          <p className="text-xs text-gray-500 dark:text-gray-500">
            提示：进入控制台点击密钥复制按钮可切换为 API Key 认证模式
          </p>
        )}
      </div>
    </div>
  )
}
