import { useEffect, useState } from "react"

export interface TokenData {
  expiry: null | number
  isValid: boolean
  token: null | string
  tokenType: "api_key" | "jwt" | null
}

export function usePackyToken(): TokenData {
  const [tokenData, setTokenData] = useState<TokenData>({
    expiry: null,
    isValid: false,
    token: null,
    tokenType: null
  })

  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getStoredToken" }, (response) => {
      if (response) {
        const { expiry, token, tokenType } = response
        // API Key不检查过期时间，JWT检查是否过期
        // 如果JWT没有expiry信息，默认认为有效
        const isValid =
          token &&
          (tokenType === "api_key" ||
            (tokenType === "jwt" && (!expiry || Date.now() < expiry)))

        setTokenData({
          expiry,
          isValid: !!isValid,
          token,
          tokenType: tokenType || null
        })
      }
    })
  }, [])

  return tokenData
}
