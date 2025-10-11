/**
 * AddAccountDialog - 添加账号对话框
 *
 * 功能：
 * 1. Token 输入表单
 * 2. 账号类型选择
 * 3. 自定义显示名称
 * 4. 表单验证和错误提示
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "表单要简洁，用户输入最小化"
 * ⚛️ Dan: "受控组件，状态驱动 UI"
 * ☕ Bloch: "清晰的表单验证规则"
 * 🏛️ Fowler: "领域模型映射到表单字段"
 *
 * @since v3.0.0
 */

import { useState } from "react"

import type { AccountVersion, TokenType } from "~/types"

interface AddAccountDialogProps {
  accountType: AccountVersion
  isOpen: boolean
  onClose: () => void
  onSubmit: (config: {
    displayName?: string
    token: string
    tokenType: TokenType
    type: AccountVersion
  }) => Promise<void>
}

/**
 * 添加账号对话框
 *
 * @example
 * ```tsx
 * <AddAccountDialog
 *   accountType={AccountVersion.SHARED}
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onSubmit={async (config) => {
 *     await accountManager.addAccount(config)
 *   }}
 * />
 * ```
 */
export function AddAccountDialog({
  accountType,
  isOpen,
  onClose,
  onSubmit
}: AddAccountDialogProps) {
  const [token, setToken] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [tokenType, setTokenType] = useState<TokenType>("jwt" as TokenType)
  const [error, setError] = useState<null | string>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) {
    return null
  }

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 验证 token
    if (!token.trim()) {
      setError("请输入 Token")
      return
    }

    // 验证 token 格式
    if (tokenType === "jwt" && !token.startsWith("ey")) {
      setError("JWT Token 格式不正确")
      return
    }

    if (tokenType === "api_key" && !token.startsWith("sk-ant-")) {
      setError("API Key 格式不正确（应以 sk-ant- 开头）")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await onSubmit({
        displayName: displayName.trim() || undefined,
        token: token.trim(),
        tokenType,
        type: accountType
      })

      // 重置表单
      setToken("")
      setDisplayName("")
      setTokenType("jwt" as TokenType)
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "添加账号失败"
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理取消
  const handleCancel = () => {
    setToken("")
    setDisplayName("")
    setTokenType("jwt" as TokenType)
    setError(null)
    onClose()
  }

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>添加账号</h2>
          <button className="close-button" onClick={handleCancel}>
            ×
          </button>
        </div>

        <form className="dialog-form" onSubmit={handleSubmit}>
          {/* Token 类型选择 */}
          <div className="form-group">
            <label htmlFor="tokenType">Token 类型</label>
            <select
              disabled={isSubmitting}
              id="tokenType"
              onChange={(e) => setTokenType(e.target.value as TokenType)}
              value={tokenType}>
              <option value="jwt">JWT Token</option>
              <option value="api_key">API Key</option>
            </select>
          </div>

          {/* Token 输入 */}
          <div className="form-group">
            <label htmlFor="token">
              {tokenType === "jwt" ? "JWT Token" : "API Key"}
            </label>
            <textarea
              disabled={isSubmitting}
              id="token"
              onChange={(e) => setToken(e.target.value)}
              placeholder={tokenType === "jwt" ? "eyJ..." : "sk-ant-api03-..."}
              required
              rows={4}
              value={token}
            />
          </div>

          {/* 显示名称（可选） */}
          <div className="form-group">
            <label htmlFor="displayName">显示名称（可选）</label>
            <input
              disabled={isSubmitting}
              id="displayName"
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如：我的公交车账号"
              type="text"
              value={displayName}
            />
          </div>

          {/* 错误提示 */}
          {error && <div className="error-message">{error}</div>}

          {/* 操作按钮 */}
          <div className="dialog-actions">
            <button
              className="cancel-button"
              disabled={isSubmitting}
              onClick={handleCancel}
              type="button">
              取消
            </button>
            <button
              className="submit-button"
              disabled={isSubmitting}
              type="submit">
              {isSubmitting ? "添加中..." : "添加账号"}
            </button>
          </div>
        </form>

        {/* 样式 */}
        <style jsx>{`
          .dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 20px;
          }

          .dialog-content {
            background: white;
            border-radius: 12px;
            width: 100%;
            max-width: 480px;
            box-shadow:
              0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }

          .dialog-header {
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .dialog-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
          }

          .close-button {
            width: 32px;
            height: 32px;
            border: none;
            background: transparent;
            color: #a0aec0;
            font-size: 24px;
            cursor: pointer;
            transition: color 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .close-button:hover {
            color: #718096;
          }

          .dialog-form {
            padding: 24px;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 500;
            color: #4a5568;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              sans-serif;
            transition: border-color 0.2s;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: #3182ce;
          }

          .form-group input:disabled,
          .form-group select:disabled,
          .form-group textarea:disabled {
            background: #f7fafc;
            color: #a0aec0;
            cursor: not-allowed;
          }

          .form-group textarea {
            resize: vertical;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo,
              Courier, monospace;
          }

          .error-message {
            padding: 12px;
            background: #fed7d7;
            color: #c53030;
            border-radius: 6px;
            font-size: 14px;
            margin-bottom: 20px;
          }

          .dialog-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }

          .cancel-button,
          .submit-button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }

          .cancel-button {
            background: white;
            color: #4a5568;
            border: 1px solid #e2e8f0;
          }

          .cancel-button:hover {
            background: #f7fafc;
          }

          .submit-button {
            background: #3182ce;
            color: white;
          }

          .submit-button:hover {
            background: #2c5aa0;
          }

          .cancel-button:disabled,
          .submit-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  )
}
