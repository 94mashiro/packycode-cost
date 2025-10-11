/**
 * 账号管理后台页面（shadcn/ui 设计规范版本）
 *
 * 功能：
 * 1. 账号列表展示（表格形式，包含站点和 Token 信息）
 * 2. 账号编辑（修改名称、邮箱）
 * 3. 账号删除（带确认对话框）
 * 4. 账号新增（支持所有类型和站点）
 * 5. Token 复制功能
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "表格要清晰，一眼看出关键信息"
 * ⚛️ Dan: "shadcn/ui 组件库，一致的设计语言"
 * ☕ Bloch: "类型安全，所有字段都有明确类型"
 * 🏛️ Fowler: "领域模型映射到 UI，每列都有业务意义"
 *
 * @since v3.2.0
 * @version v3.3.0 - shadcn 设计规范重构，添加站点和 Token 列
 */

import "~/reset.css"

import { Check, Copy, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/shadcn/alert-dialog"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import { Skeleton } from "@/components/shadcn/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/shadcn/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/shadcn/tooltip"
import { AddAccountDialog } from "~/components/AddAccountDialog"
import { EditAccountDialog } from "~/components/EditAccountDialog"
import { useAccountManager } from "~/hooks/useAccountManager"
import { type Account, TokenType } from "~/types"
import { PackySite } from "~/types/account"

/**
 * 账号管理主页面
 */
function AccountManagerPage() {
  const {
    accountDataMap,
    accounts,
    addAccount,
    error: managerError,
    loading,
    refreshAccounts,
    removeAccount,
    updateAccount
  } = useAccountManager() // 获取所有账号

  // 对话框状态
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  // 操作状态
  const [isDeleting, setIsDeleting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<null | string>(null)

  /**
   * 处理编辑账号
   */
  const handleEdit = (account: Account) => {
    setSelectedAccount(account)
    setShowEditDialog(true)
  }

  /**
   * 处理删除账号
   */
  const handleDelete = (account: Account) => {
    setSelectedAccount(account)
    setShowDeleteDialog(true)
  }

  /**
   * 确认删除账号
   */
  const confirmDelete = async () => {
    if (!selectedAccount) return

    try {
      setIsDeleting(true)
      await removeAccount(selectedAccount.id)
      setShowDeleteDialog(false)
      setSelectedAccount(null)
    } catch (err) {
      console.error("Failed to delete account:", err)
      // 错误已经在 Hook 中处理
    } finally {
      setIsDeleting(false)
    }
  }

  /**
   * 获取站点显示名称
   */
  const getSiteName = (site?: PackySite): string => {
    if (!site) return "-"
    const siteNames: Record<PackySite, string> = {
      [PackySite.CODEX]: "Codex",
      [PackySite.SHARED]: "共享",
      [PackySite.WWW]: "主站"
    }
    return siteNames[site]
  }

  /**
   * 获取站点 Badge 样式
   */
  const getSiteBadgeVariant = (
    site?: PackySite
  ): "default" | "outline" | "secondary" => {
    if (!site) return "outline"
    switch (site) {
      case PackySite.CODEX:
        return "outline" // 边框
      case PackySite.SHARED:
        return "secondary" // 灰色
      case PackySite.WWW:
        return "default" // 蓝色
      default:
        return "outline"
    }
  }

  /**
   * 获取 Token 类型的显示名称
   */
  const getTokenTypeName = (tokenType: TokenType): string => {
    return tokenType === "jwt" ? "JWT" : "API Key"
  }

  /**
   * 格式化 Token 显示
   * 显示前6位和后6位，中间用省略号
   */
  const formatToken = (token: string, length: number = 6): string => {
    if (token.length <= length * 2) {
      return token
    }
    return `${token.substring(0, length)}...${token.substring(token.length - length)}`
  }

  /**
   * 复制 Token 到剪贴板
   */
  const copyToClipboard = async (token: string, accountId: string) => {
    try {
      await navigator.clipboard.writeText(token)
      setCopiedToken(accountId)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (err) {
      console.error("Failed to copy token:", err)
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 bg-background p-8">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">账号管理</h2>
            <p className="text-sm leading-normal text-muted-foreground">
              管理所有账号,支持编辑、删除和新增操作
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => refreshAccounts()}
                  size="icon"
                  variant="outline">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>刷新账号列表</p>
              </TooltipContent>
            </Tooltip>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新增账号
            </Button>
          </div>
        </div>

        {/* 错误提示 */}
        {managerError && (
          <Alert variant="destructive">
            <AlertDescription>{managerError}</AlertDescription>
          </Alert>
        )}

        {/* 账号列表 */}
        <div className="space-y-4">
          {loading && accounts.length === 0 ? (
            // 加载骨架屏
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div className="flex items-center space-x-4" key={i}>
                  <Skeleton className="h-8 w-[80px]" />
                  <Skeleton className="h-8 w-[100px]" />
                  <Skeleton className="h-8 w-[150px]" />
                  <Skeleton className="h-8 w-[100px]" />
                  <Skeleton className="h-8 w-[100px]" />
                  <Skeleton className="h-8 w-[180px]" />
                  <Skeleton className="h-8 w-[150px]" />
                  <Skeleton className="h-8 w-[120px]" />
                  <Skeleton className="h-8 w-[150px]" />
                </div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            /* 空状态 */
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed">
              <div className="flex flex-col items-center gap-1 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Plus className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">暂无账号</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  开始添加您的第一个账号以开始使用
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加第一个账号
                </Button>
              </div>
            </div>
          ) : (
            /* 账号表格 */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">站点</TableHead>
                    <TableHead className="w-[150px]">显示名称</TableHead>
                    <TableHead className="w-[100px]">Token类型</TableHead>
                    <TableHead className="min-w-[180px]">Token</TableHead>
                    <TableHead className="w-[150px]">邮箱</TableHead>
                    <TableHead className="w-[120px]">预算使用</TableHead>
                    <TableHead className="w-[150px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      {/* 站点 */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={getSiteBadgeVariant(account.site)}>
                              {getSiteName(account.site)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{account.site || "未指定站点"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* 显示名称 */}
                      <TableCell className="font-medium">
                        {account.displayName}
                      </TableCell>

                      {/* Token 类型 */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getTokenTypeName(account.tokenType)}
                        </span>
                      </TableCell>

                      {/* Token - 可复制 */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              className="h-7 font-mono text-xs"
                              onClick={() =>
                                copyToClipboard(account.token, account.id)
                              }
                              size="sm"
                              variant="ghost">
                              {formatToken(account.token)}
                              {copiedToken === account.id ? (
                                <Check className="ml-2 h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="ml-2 h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md break-all">
                            <p className="font-mono text-xs">{account.token}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* 邮箱 */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {accountDataMap[account.id]?.userInfo?.email || "-"}
                        </span>
                      </TableCell>

                      {/* 预算使用 */}
                      <TableCell>
                        {accountDataMap[account.id]?.snapshot ? (
                          <span className="text-sm tabular-nums">
                            $
                            {accountDataMap[
                              account.id
                            ]?.snapshot?.dailySpent.toFixed(2)}{" "}
                            / $
                            {accountDataMap[
                              account.id
                            ]?.snapshot?.dailyLimit.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>

                      {/* 操作 */}
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleEdit(account)}
                                size="sm"
                                variant="ghost">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>编辑账号</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleDelete(account)}
                                size="sm"
                                variant="ghost">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>删除账号</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* 添加账号对话框 */}
        <AddAccountDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSubmit={async (config) => {
            await addAccount(config)
            setShowAddDialog(false)
          }}
        />

        {/* 编辑账号对话框 */}
        <EditAccountDialog
          account={selectedAccount}
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false)
            setSelectedAccount(null)
          }}
          onSubmit={updateAccount}
        />

        {/* 删除确认对话框 */}
        <AlertDialog
          onOpenChange={(open) => {
            if (!open) {
              setShowDeleteDialog(false)
              setSelectedAccount(null)
            }
          }}
          open={showDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除账号 "{selectedAccount?.displayName}" 吗？
                <br />
                此操作无法撤销，将删除该账号的所有数据。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
              <AlertDialogAction disabled={isDeleting} onClick={confirmDelete}>
                {isDeleting ? "删除中..." : "确认删除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

export default AccountManagerPage
