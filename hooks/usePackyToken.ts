import { useEffect, useState } from "react"

export interface TokenData {
  isValid: boolean
  timestamp: null | number
  token: null | string
  tokenType: "api_key" | "jwt" | null
}

export function usePackyToken(): TokenData {
  const [tokenData, setTokenData] = useState<TokenData>({
    isValid: false,
    timestamp: null,
    token: null,
    tokenType: null
  })

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getStoredToken" }, (response) => {
      if (response) {
        const { timestamp, token, tokenType } = response
        // API Key不检查时间有效性，JWT检查24小时有效期
        const isValid =
          token &&
          (tokenType === "api_key" ||
            (timestamp && Date.now() - timestamp < 24 * 60 * 60 * 1000))

        setTokenData({
          isValid: !!isValid,
          timestamp,
          token,
          tokenType: tokenType || null
        })
      }
    })
  }, [])

  return tokenData
}
