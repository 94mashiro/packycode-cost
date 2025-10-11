/**
 * EditAccountDialog - 编辑账号对话框
 *
 * 功能：
 * 1. 编辑账号所有字段（v3.3.0+ 放开所有字段编辑）
 * 2. 支持修改站点、Token类型、Token、显示名称、邮箱
 * 3. 表单验证和错误提示
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "简单的表单，专注核心编辑功能"
 * ⚛️ Dan: "受控组件，即时反馈"
 * ☕ Bloch: "类型安全，清晰的接口"
 * 🏛️ Fowler: "单一职责，只负责编辑"
 *
 * @since v3.2.0
 * @version v3.3.0 - 放开所有字段编辑
 */

import { useEffect, useState } from "react"

import { Button } from "@/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/shadcn/dialog"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"
import { RadioGroup, RadioGroupItem } from "@/components/shadcn/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/shadcn/select"
import { Textarea } from "@/components/shadcn/textarea"
import { type Account, TokenType, type UpdateAccountConfig } from "~/types"
import { PackySite } from "~/types/account"

interface EditAccountDialogProps {
  account: Account | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (accountId: string, updates: UpdateAccountConfig) => Promise<void>
}

/**
 * 编辑账号对话框
 *
 * @example
 * ```tsx
 * <EditAccountDialog
 *   account={selectedAccount}
 *   isOpen={showEditDialog}
 *   onClose={() => setShowEditDialog(false)}
 *   onSubmit={async (id, updates) => {
 *     await accountManager.updateAccount(id, updates)
 *   }}
 * />
 * ```
 */
export function EditAccountDialog({
  account,
  isOpen,
  onClose,
  onSubmit
}: EditAccountDialogProps) {
  const [site, setSite] = useState<PackySite>(PackySite.WWW)
  const [tokenType, setTokenType] = useState<TokenType>(TokenType.JWT)
  const [token, setToken] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<null | string>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 当账号变化时，更新表单数据
  useEffect(() => {
    if (account) {
      setSite(account.site || PackySite.WWW)
      setTokenType(account.tokenType)
      setToken(account.token)
      setDisplayName(account.displayName)
    }
  }, [account])

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!account) {
      return
    }

    // 验证显示名称
    if (!displayName.trim()) {
      setError("显示名称不能为空")
      return
    }

    // 验证 token
    if (!token.trim()) {
      setError("Token 不能为空")
      return
    }

    // 验证 token 格式
    if (tokenType === TokenType.JWT && !token.startsWith("ey")) {
      setError("JWT Token 格式不正确")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const updates: UpdateAccountConfig = {
        displayName: displayName.trim(),
        site,
        token: token.trim(),
        tokenType
      }

      await onSubmit(account.id, updates)
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "更新账号失败"
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 处理取消
  const handleCancel = () => {
    setError(null)
    onClose()
  }

  if (!account) {
    return null
  }

  return (
    <Dialog onOpenChange={handleCancel} open={isOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>编辑账号</DialogTitle>
          <DialogDescription>
            修改账号的所有信息（站点、Token、显示名称、邮箱）
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* 站点选择 */}
          <div className="space-y-3">
            <Label>选择站点 *</Label>
            <RadioGroup
              className="space-y-2"
              onValueChange={(value) => setSite(value as PackySite)}
              value={site}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="edit-site-www" value={PackySite.WWW} />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="edit-site-www">
                  {PackySite.WWW}{" "}
                  <span className="text-xs text-muted-foreground">(主站)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  id="edit-site-shared"
                  value={PackySite.SHARED}
                />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="edit-site-shared">
                  {PackySite.SHARED}{" "}
                  <span className="text-xs text-muted-foreground">
                    (共享站点)
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="edit-site-codex" value={PackySite.CODEX} />
                <Label
                  className="cursor-pointer font-normal"
                  htmlFor="edit-site-codex">
                  {PackySite.CODEX}{" "}
                  <span className="text-xs text-muted-foreground">
                    (Codex 站点)
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Token 类型选择 */}
          <div className="space-y-2">
            <Label htmlFor="edit-tokenType">Token 类型 *</Label>
            <Select
              disabled={isSubmitting}
              onValueChange={(value) => setTokenType(value as TokenType)}
              value={tokenType}>
              <SelectTrigger id="edit-tokenType">
                <SelectValue placeholder="选择 Token 类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jwt">JWT Token</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Token 输入 */}
          <div className="space-y-2">
            <Label htmlFor="edit-token">
              {tokenType === TokenType.JWT ? "JWT Token" : "API Key"} *
            </Label>
            <Textarea
              className="font-mono text-xs"
              disabled={isSubmitting}
              id="edit-token"
              onChange={(e) => setToken(e.target.value)}
              placeholder={
                tokenType === TokenType.JWT ? "eyJ..." : "sk-ant-api03-..."
              }
              required
              rows={4}
              value={token}
            />
            <p className="text-xs text-muted-foreground">
              {tokenType === TokenType.JWT
                ? "从浏览器 Cookie 中获取的 JWT Token"
                : "从 PackyCode 控制台生成的 API Key"}
            </p>
          </div>

          {/* 显示名称 */}
          <div className="space-y-2">
            <Label htmlFor="edit-displayName">显示名称 *</Label>
            <Input
              disabled={isSubmitting}
              id="edit-displayName"
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如：我的公交车账号"
              required
              type="text"
              value={displayName}
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={handleCancel}
              type="button"
              variant="outline">
              取消
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
