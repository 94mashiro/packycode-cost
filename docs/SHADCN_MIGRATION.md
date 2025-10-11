# shadcn/ui 组件路径迁移说明

## ✅ 迁移完成

shadcn/ui 组件库的安装路径已从 `components/ui` 成功迁移到 `components/shadcn`。

## 📊 迁移详情

### 变更概览

| 项目 | 迁移前 | 迁移后 |
|------|--------|--------|
| **配置文件** | `"ui": "@/components/ui"` | `"ui": "@/components/shadcn"` |
| **组件目录** | `components/ui/` | `components/shadcn/` |
| **导入路径** | `@/components/ui/button` | `@/components/shadcn/button` |

### 已更新的文件

1. ✅ **components.json** - 更新 `aliases.ui` 配置
2. ✅ **components/shadcn/** - 新建目录并移动 button.tsx
3. ✅ **components/examples/ShadcnButtonExamples.tsx** - 更新导入路径
4. ✅ **docs/SHADCN_UI_GUIDE.md** - 更新所有文档引用

### 删除的内容

- ❌ `components/ui/` 目录（已删除）

## 🚀 使用新路径

### 安装新组件

shadcn CLI 会自动使用新的配置路径：

```bash
npx shadcn@latest add card
# 自动安装到: components/shadcn/card.tsx
```

### 导入组件

```tsx
// ✅ 正确的导入方式
import { Button } from "@/components/shadcn/button"
import { Card } from "@/components/shadcn/card"

// ❌ 旧路径已失效
import { Button } from "@/components/ui/button"
```

## 💡 为什么要迁移？

### 语义清晰

**之前**: `components/ui` - 太通用，不知道是哪个 UI 库
**现在**: `components/shadcn` - 明确表明这是 shadcn/ui 组件库

### 目录结构更清晰

```
components/
├── shadcn/              # shadcn/ui 组件库 (第三方)
│   ├── button.tsx
│   └── card.tsx
├── budget/              # 自定义业务组件
│   ├── BudgetDisplay.tsx
│   └── BudgetChart.tsx
├── examples/            # 示例代码
│   └── ShadcnButtonExamples.tsx
└── AccountSwitcher.tsx  # 项目组件
```

### 易于维护

- 明确区分第三方 UI 库组件和项目自定义组件
- 未来添加其他 UI 库时不会产生命名冲突
- 与项目其他目录命名风格保持一致

## 📝 代码质量验证

迁移后的代码质量检查结果：

- ✅ **TypeScript 编译**: 零错误
- ✅ **ESLint**: 仅 2 个可忽略警告（示例代码和导出警告）
- ✅ **项目运行**: dev 服务器正常运行
- ✅ **类型检查**: 所有导入路径类型正确

## 🎯 验证迁移成功

### 1. 检查配置

```bash
cat components.json | grep '"ui"'
# 输出: "ui": "@/components/shadcn"
```

### 2. 检查目录结构

```bash
ls components/ | grep shadcn
# 输出: shadcn
```

### 3. 测试安装新组件

```bash
npx shadcn@latest add badge
# 应该安装到 components/shadcn/badge.tsx
```

## 🔄 如果需要回滚

如果遇到问题需要回滚到旧路径：

```bash
# 1. 重命名目录
mv components/shadcn components/ui

# 2. 恢复 components.json
# 将 "ui": "@/components/shadcn" 改回 "ui": "@/components/ui"

# 3. 更新所有导入
# 将所有 @/components/shadcn/* 改回 @/components/ui/*
```

## 📚 相关文档

- 完整使用指南：[docs/SHADCN_UI_GUIDE.md](./SHADCN_UI_GUIDE.md)
- shadcn/ui 官方文档：https://ui.shadcn.com
- components.json 配置：https://ui.shadcn.com/docs/components-json

---

**迁移完成时间**: 2025-10-11
**迁移状态**: ✅ 成功
**影响范围**: 1 个组件，1 个示例文件，1 个文档文件
