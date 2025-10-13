/**
 * 账号管理后台页面（shadcn/ui 设计规范版本）
 *
 * 功能：
 * 1. 账号列表展示（表格形式，包含站点和 Token 信息）
 * 2. 账号编辑（修改名称）
 * 3. 账号删除（带确认对话框）
 * 4. 账号新增（支持所有类型和站点）
 * 5. Token 复制功能
 *
 * 设计原则 (四师协作):
 * 🐧 Linus: "表格要清晰，一眼看出关键信息"
 * ⚛️ Dan: "shadcn/ui 组件库，一致的设计语言"
 * ☕ Bloch: "类型安全，所有字段都有明确类型"
 * 🏛️ Fowler: "领域模型映射到 UI，每列都有业务意义"
 */

import "~/reset.css"

import { Check, Copy, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast, Toaster } from "sonner"

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
import { NotificationSettingsSection } from "~/components/NotificationSettingsSection"
import { useAccountManager } from "~/hooks/useAccountManager"
import { loggers } from "~/lib/logger"
import { getStorageManager } from "~/lib/storage"
import { StorageDomain } from "~/lib/storage/domains"
import { getTokenExpiration } from "~/modules/auth/jwt"
import { fetchAllDataAsync } from "~/modules/tasks"
import {
  type Account,
  type AuthDomain,
  TokenType
} from "~/types"
import { PackySite } from "~/types/account"
import { type AuthenticationResult, getAuthenticationStatus } from "~/utils/authStatus"
import { getSiteName as getSiteDisplayName } from "~/utils/siteHelpers"

/**
 * 账号管理主页面
 */
function AccountManagerPage() {
  const {
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copiedToken, setCopiedToken] = useState<null | string>(null)
  const [statusMap, setStatusMap] = useState<
    Record<string, AuthenticationResult | undefined>
  >({})

  // 当账号列表变化时，拉取每个账号的 tokenValidation 状态
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const storage = getStorageManager()
        const result: Record<string, AuthenticationResult | undefined> = {}
        await Promise.all(
          accounts.map(async (acc) => {
            const authData = await storage.get<AuthDomain>(
              acc.id,
              StorageDomain.AUTH
            )
            result[acc.id] = getAuthenticationStatus(authData)
          })
        )
        setStatusMap(result)
      } catch (e) {
        loggers.ui.debug("Failed to load authentication statuses:", e)
      }
    }
    if (accounts.length > 0) {
      loadStatuses()
    } else {
      setStatusMap({})
    }
  }, [accounts])

  /**
   * 获取详细的状态消息
   */
  const getDetailedMessage = (authStatus: AuthenticationResult): string => {
    let message = authStatus.reason || authStatus.displayLabel

    if (authStatus.httpStatus) {
      message += ` (HTTP ${authStatus.httpStatus})`
    }
    if (authStatus.checkedAt) {
      const checkedTime = new Date(authStatus.checkedAt).toLocaleString()
      message += `\n检测时间：${checkedTime}`
    }

    return message
  }

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
      loggers.ui.error("Failed to delete account:", err)
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
    return getSiteDisplayName(site)
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
      loggers.ui.error("Failed to copy token:", err)
    }
  }

  /**
   * 刷新账号列表
   */
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // 批量检查（复用任务执行）
      await fetchAllDataAsync()
      await refreshAccounts()

      // 成功提示
      toast.success("刷新成功", {
        description: "账号列表已更新"
      })
    } catch (e) {
      loggers.ui.error("Refresh failed:", e)

      // 错误提示
      toast.error("刷新失败", {
        description: "请检查网络连接后重试"
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <TooltipProvider>
      <Toaster position="top-center" />
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
                  disabled={isRefreshing}
                  onClick={handleRefresh}
                  size="icon"
                  variant="outline">
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRefreshing ? "刷新中..." : "刷新账号列表"}</p>
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
                  <Skeleton className="h-8 w-[100px]" />
                  <Skeleton className="h-8 w-[150px]" />
                  <Skeleton className="h-8 w-[100px]" />
                  <Skeleton className="h-8 w-[180px]" />
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
                    <TableHead className="w-[120px]">站点</TableHead>
                    <TableHead className="w-[300px]">显示名称</TableHead>
                    <TableHead className="w-[200px]">Token类型</TableHead>
                    <TableHead className="w-[100px]">状态</TableHead>
                    <TableHead className="min-w-[300px]">Token</TableHead>
                    <TableHead className="w-[120px] text-right">操作</TableHead>
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
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">
                            {getTokenTypeName(account.tokenType)}
                          </span>
                          {account.tokenType === TokenType.JWT &&
                            (() => {
                              const expInfo = getTokenExpiration(account.token)
                              return (
                                <span
                                  className={`text-xs ${
                                    expInfo.isExpired
                                      ? "font-medium text-red-500"
                                      : "text-muted-foreground"
                                  }`}>
                                  ({expInfo.formatted})
                                </span>
                              )
                            })()}
                        </div>
                      </TableCell>

                      {/* 状态 */}
                      <TableCell>
                        {(() => {
                          const authStatus = statusMap[account.id]
                          if (!authStatus) {
                            return (
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-gray-400" />
                                <span className="text-sm text-muted-foreground">
                                  未知
                                </span>
                              </div>
                            )
                          }

                          const detailedMessage = getDetailedMessage(authStatus)

                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-help">
                                  <span
                                    className={`h-2 w-2 rounded-full ${authStatus.displayColor}`}
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {authStatus.displayLabel}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="whitespace-pre-line text-sm">
                                  {detailedMessage}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        })()}
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

        {/* 推送通知设置 */}
        <NotificationSettingsSection />

        {/* 添加账号对话框 */}
        <AddAccountDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSubmit={async (config) => {
            await addAccount(config)
            setShowAddDialog(false)
            handleRefresh()
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
          onSubmit={async (accountId, updates) => {
            await updateAccount(accountId, updates)
            handleRefresh()
          }}
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
