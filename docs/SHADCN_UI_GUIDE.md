# shadcn/ui 集成指南

## 📦 集成完成

shadcn/ui 已成功集成到 PackyCode Cost 项目中！

## ✅ 已完成的配置

### 1. TypeScript 配置
- ✅ 添加了 `@/*` 路径别名到 `tsconfig.json`
- ✅ 支持 `@/components/shadcn/*` 形式的导入

### 2. CSS 主题系统
- ✅ 在 `reset.css` 中添加了完整的 shadcn/ui CSS 变量
- ✅ 支持亮色/暗色主题切换
- ✅ 包含所有语义化颜色（primary, secondary, accent, destructive 等）

### 3. Tailwind CSS 配置
- ✅ 扩展了主题颜色以使用 CSS 变量
- ✅ 添加了 shadcn/ui 专用的动画和圆角配置
- ✅ 支持语义化的颜色类名（如 `bg-primary`, `text-muted-foreground`）

### 4. 组件系统
- ✅ 创建了 `components.json` 配置文件
- ✅ 安装了 Button 组件作为示例
- ✅ 安装了必要的依赖：
  - `@radix-ui/react-slot`
  - `class-variance-authority`

## 🚀 使用方法

### 安装新组件

使用 shadcn CLI 安装任何组件：

```bash
# 示例：安装常用组件
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add dropdown-menu
npx shadcn@latest add popover
npx shadcn@latest add toast
```

### 在代码中使用组件

```tsx
import { Button } from "@/components/shadcn/button"

export function MyComponent() {
  return (
    <div>
      {/* 默认按钮 */}
      <Button>Click me</Button>

      {/* 不同变体 */}
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>

      {/* 不同尺寸 */}
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Icons.Plus />
      </Button>
    </div>
  )
}
```

## 🎨 主题定制

### CSS 变量（推荐）

在 `reset.css` 中修改 CSS 变量来定制主题：

```css
:root {
  --primary: 240 5.9% 10%;  /* 修改主色调 */
  --radius: 0.5rem;          /* 修改全局圆角 */
}
```

### Tailwind 类名

也可以直接使用 Tailwind 类名：

```tsx
<Button className="bg-gradient-to-r from-blue-500 to-purple-500">
  渐变按钮
</Button>
```

## 📁 项目结构

```
/Users/bytedance/Codes/packycode-cost/
├── components/
│   └── shadcn/          # shadcn/ui 组件目录
│       └── button.tsx   # Button 组件
├── lib/
│   └── utils.ts         # cn() 工具函数（已存在）
├── reset.css            # CSS 变量和主题配置
├── tailwind.config.js   # Tailwind 配置（已扩展）
├── tsconfig.json        # TypeScript 配置（已添加别名）
└── components.json      # shadcn/ui 配置文件
```

## 🔧 配置详情

### components.json

```json
{
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "reset.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/shadcn"
  }
}
```

## 💡 最佳实践

### 1. 保持一致的导入方式

✅ **推荐**：使用别名导入
```tsx
import { Button } from "@/components/shadcn/button"
```

❌ **不推荐**：使用相对路径
```tsx
import { Button } from "../../../components/shadcn/button"
```

### 2. 组件组合

shadcn/ui 组件支持组合使用：

```tsx
import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"

export function DashboardCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>用户信息</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>查看详情</Button>
      </CardContent>
    </Card>
  )
}
```

### 3. 与现有项目集成

shadcn/ui 组件可以与项目现有组件无缝集成：

```tsx
// 现有的 RefreshButton 组件可以使用 shadcn/ui 的 Button
import { Button } from "@/components/shadcn/button"
import { RefreshCw } from "lucide-react"

export function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="icon" onClick={onClick}>
      <RefreshCw className="h-4 w-4" />
    </Button>
  )
}
```

## 🌓 暗色模式

项目已配置 `darkMode: "class"`，在根元素添加 `dark` 类即可切换：

```tsx
// 切换暗色模式
document.documentElement.classList.toggle('dark')
```

## 📚 常用组件推荐

根据项目需求，推荐安装以下组件：

```bash
# UI 基础组件
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add label

# 交互组件
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add popover
npx shadcn@latest add tooltip

# 数据展示
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add progress
npx shadcn@latest add skeleton

# 反馈组件
npx shadcn@latest add toast
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
```

## 🔗 资源链接

- [shadcn/ui 官方文档](https://ui.shadcn.com)
- [组件浏览器](https://ui.shadcn.com/docs/components)
- [主题定制器](https://ui.shadcn.com/themes)
- [示例代码](https://ui.shadcn.com/examples)

## ⚠️ 注意事项

1. **Chrome Extension 限制**：
   - 不要使用动态导入（dynamic imports）
   - 所有组件都是静态导入的，适合 Chrome Extension 环境

2. **Plasmo 兼容性**：
   - 已测试与 Plasmo 0.90.5 完全兼容
   - 路径别名配置与 Plasmo 的 `~*` 别名共存

3. **TypeScript 支持**：
   - 所有组件都有完整的类型定义
   - 支持智能提示和类型检查

## ✨ 下一步

现在你可以：

1. 浏览 [shadcn/ui 组件库](https://ui.shadcn.com/docs/components) 选择需要的组件
2. 使用 `npx shadcn@latest add [component]` 安装组件
3. 在项目中导入并使用组件
4. 根据需要定制主题和样式

享受使用 shadcn/ui 构建美观的 UI！🎉
