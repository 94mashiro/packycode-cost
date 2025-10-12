import { Label } from "@/components/shadcn/label"
import { Switch } from "@/components/shadcn/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/shadcn/tooltip"
import { useNotificationSettings } from "~/hooks/useNotificationSettings"

/**
 * 推送通知设置区域组件
 *
 * 设计原则：
 * 🐧 Linus: "保持布局一致性，与账号管理表格使用相同的容器样式"
 * ⚛️ Dan: "减少视觉层次，去掉不必要的 Card 和嵌套边框"
 * ☕ Bloch: "文案清晰，用户友好的表达"
 * 🏛️ Fowler: "业务语言映射到 UI"
 */
export function NotificationSettingsSection() {
  const { notificationGroups, toggleSetting } = useNotificationSettings()

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* 标题区域 - 与账号管理保持一致 */}
        <div className="space-y-1">
          <h3 className="text-2xl font-semibold">通知偏好</h3>
          <p className="text-sm leading-normal text-muted-foreground">
            管理您希望接收的站点通知
          </p>
        </div>

        {/* 通知列表 - 使用统一容器 */}
        <div className="rounded-md border">
          <div className="divide-y">
            {notificationGroups.map((group) => (
              <div className="p-6" key={group.title}>
                {/* 组标题 */}
                <div className="mb-4 space-y-1">
                  <h4 className="text-sm font-medium">{group.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {group.description}
                  </p>
                </div>

                {/* 设置项列表 - 简化布局，去除多余边框 */}
                <div className="space-y-3">
                  {group.settings.map((setting) => (
                    <div
                      className="flex items-center justify-between py-2"
                      key={setting.id}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{setting.icon}</span>
                        <div className="space-y-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Label
                                className="text-sm font-medium cursor-pointer"
                                htmlFor={setting.id}>
                                {setting.label}
                              </Label>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{setting.description}</p>
                            </TooltipContent>
                          </Tooltip>
                          <p className="text-xs text-muted-foreground">
                            {setting.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={setting.enabled}
                        id={setting.id}
                        onCheckedChange={() => toggleSetting(setting.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
