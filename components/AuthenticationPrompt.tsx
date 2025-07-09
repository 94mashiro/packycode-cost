interface AuthenticationPromptProps {
  tokenData: TokenData
  tokenExpiration: TokenExpiration
}

interface TokenData {
  isValid: boolean
}

interface TokenExpiration {
  isExpired: boolean
}

export function AuthenticationPrompt({
  tokenData,
  tokenExpiration
}: AuthenticationPromptProps) {
  if (tokenData.isValid && !tokenExpiration.isExpired) {
    return null
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
      <div className="space-y-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          {!tokenData.isValid
            ? "请先访问 packycode.com 登录以获取会话信息"
            : "登录态已过期，请重新登录"}
        </p>
        <button
          className="w-full rounded-md bg-yellow-600 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors dark:bg-yellow-700 dark:hover:bg-yellow-600"
          onClick={() =>
            chrome.tabs.create({
              url: "https://www.packycode.com/dashboard"
            })
          }>
          {!tokenData.isValid ? "前往登录" : "重新登录"}
        </button>
      </div>
    </div>
  )
}
