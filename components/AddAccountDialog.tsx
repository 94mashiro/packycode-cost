/**
 * AddAccountDialog - 添加账号对话框（shadcn/ui 版本）
 *
 * 功能：
 * 1. Token 输入表单
 * 2. 账号类型选择
 * 3. 站点选择（三个站点）
 * 4. 自定义显示名称
 * 5. 表单验证和错误提示
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "表单要简洁，用户输入最小化"
 * ⚛️ Dan: "受控组件，状态驱动 UI，shadcn/ui 组件库"
 * ☕ Bloch: "清晰的表单验证规则，类型安全"
 * 🏛️ Fowler: "领域模型映射到表单字段"
 *
 * @since v3.0.0
 * @version v3.2.0 - 使用 shadcn/ui 设计，添加站点选择
 */

import { useState } from "react"

import type { TokenType } from "~/types"

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
import { PackySite } from "~/types/account"

interface AddAccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (config: {
    displayName?: string
    site: PackySite
    token: string
    tokenType: TokenType
  }) => Promise<void>
}

/**
 * 添加账号对话框
 *
 * @example
 * ```tsx
 * <AddAccountDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onSubmit={async (config) => {
 *     await accountManager.addAccount(config)
 *   }}
 * />
 * ```
 */
export function AddAccountDialog({
  isOpen,
  onClose,
  onSubmit
}: AddAccountDialogProps) {
  const [token, setToken] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [tokenType, setTokenType] = useState<TokenType>("jwt")
  const [site, setSite] = useState<PackySite>(PackySite.WWW)
  const [error, setError] = useState<null | string>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    try {
      setIsSubmitting(true)
      setError(null)

      await onSubmit({
        displayName: displayName.trim() || undefined,
        site, // 必需字段
        token: token.trim(),
        tokenType
      })

      // 重置表单
      setToken("")
      setDisplayName("")
      setTokenType("jwt")
      setSite(PackySite.WWW)
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
    setTokenType("jwt")
    setSite(PackySite.WWW)
    setError(null)
    onClose()
  }

  return (
    <Dialog onOpenChange={handleCancel} open={isOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>添加账号</DialogTitle>
          <DialogDescription>
            填写账号信息以添加新账号。所有账号数据将安全存储在本地。
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
                <RadioGroupItem id="site-www" value={PackySite.WWW} />
                <Label
                  className="font-normal cursor-pointer"
                  htmlFor="site-www">
                  {PackySite.WWW}{" "}
                  <span className="text-muted-foreground text-xs">(主站)</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="site-shared" value={PackySite.SHARED} />
                <Label
                  className="font-normal cursor-pointer"
                  htmlFor="site-shared">
                  {PackySite.SHARED}{" "}
                  <span className="text-muted-foreground text-xs">
                    (共享站点)
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="site-codex" value={PackySite.CODEX} />
                <Label
                  className="font-normal cursor-pointer"
                  htmlFor="site-codex">
                  {PackySite.CODEX}{" "}
                  <span className="text-muted-foreground text-xs">
                    (Codex 站点)
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Token 类型选择 */}
          <div className="space-y-2">
            <Label htmlFor="tokenType">Token 类型 *</Label>
            <Select
              disabled={isSubmitting}
              onValueChange={(value) => setTokenType(value as TokenType)}
              value={tokenType}>
              <SelectTrigger id="tokenType">
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
            <Label htmlFor="token">
              {tokenType === "jwt" ? "JWT Token" : "API Key"} *
            </Label>
            <Textarea
              className="font-mono text-xs"
              disabled={isSubmitting}
              id="token"
              onChange={(e) => setToken(e.target.value)}
              placeholder={tokenType === "jwt" ? "eyJ..." : "sk-ant-api03-..."}
              required
              rows={4}
              value={token}
            />
            <p className="text-xs text-muted-foreground">
              {tokenType === "jwt"
                ? "从浏览器 Cookie 中获取的 JWT Token"
                : "从 PackyCode 控制台生成的 API Key"}
            </p>
          </div>

          {/* 显示名称（可选） */}
          <div className="space-y-2">
            <Label htmlFor="displayName">显示名称（可选）</Label>
            <Input
              disabled={isSubmitting}
              id="displayName"
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如：我的公交车账号"
              type="text"
              value={displayName}
            />
            <p className="text-xs text-muted-foreground">
              自定义账号显示名称，方便识别
            </p>
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
              {isSubmitting ? "添加中..." : "添加账号"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
