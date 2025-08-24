# PackyCode Cost Monitor

<div align="center">
  <img src="assets/icon.png" alt="PackyCode Cost Monitor" width="128" height="128">
  
  <p>智能化的 PackyCode 使用监控工具，支持多种账号类型的实时额度追踪。</p>

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat&logo=google-chrome&logoColor=white)

</div>

## 📷 功能预览

<div align="center">
  <picture>
    <img width="600" alt="PackyCode Cost Monitor 界面预览" src="https://github.com/user-attachments/assets/935a74f6-b731-484e-a86e-44c8d1c65a56" />
  </picture>
  
  <p><em>实时监控您的 PackyCode 使用情况和预算</em></p>
</div>

## ✨ 功能特性

### 🎯 v2.0.0 全新特性 - 多账号类型支持
- 🚌 **公交车模式**: 传统共享账号，使用 `www.packycode.com` 域名
- 🚗 **滴滴车模式**: 全新私有账号，使用 `share.packycode.com` 域名
- 🔄 **一键切换**: 在设置面板轻松切换账号类型，数据自动隔离存储
- 🛡️ **智能适配**: 系统自动匹配对应域名和 API 端点，确保认证稳定

### 📊 核心监控功能
- 📈 **实时监控**: 查看每日和每月的 API 使用情况
- 💰 **预算跟踪**: 可视化预算进度条和余额显示
- 🎯 **智能提醒**: 预算即将耗尽时的智能提醒
- 🔒 **安全认证**: 安全的 Token 管理和用户认证

### 🔔 智能通知系统
- 🛒 **购买状态监控**: 实时监控 PackyCode 购买开放状态
- 📱 **即时通知**: 购买开放时自动桌面通知提醒
- 🎨 **Opus 模型检测**: 实时监控 Claude Opus 模型开放状态
- ⚡ **状态联动**: 多状态并行监控，一屏掌握所有信息

### 🔑 灵活认证体系
- 🔄 **双 Token 支持**: 支持 JWT 和 API Key 两种认证方式
- ⚡ **即时刷新**: 支持手动刷新和自动后台轮询
- 🔐 **自动检测**: 创建 API Key 后自动识别和切换

### 💎 用户体验优化
- 🎨 **现代 UI**: 基于 Tailwind CSS 的现代化界面设计
- ⚡ **轻量级**: 基于 Plasmo 框架，高性能低内存占用
- 📱 **响应式**: 400x600px 的精致弹窗设计

## 🚀 快速开始

### 安装

#### 方式一：Chrome Web Store 安装（推荐）

- 从 [Chrome Web Store](https://chromewebstore.google.com/detail/packycode-cost/aeddjefljmkfbocmkpienjblkdgpnamk) 安装
- **优点**：安装方便，自动更新，无需手动管理
- **缺点**：更新可能不够及时，需要等待商店审核

#### 方式二：手动安装（获取最新版本）

- 从 [Releases](https://github.com/94mashiro/packycode-cost/releases) 下载最新版本
- **优点**：可以第一时间获取最新功能和修复
- **缺点**：需要手动下载和更新，安装步骤相对复杂

### 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/94mashiro/packycode-cost.git
cd packycode-cost

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

开发模式下，在浏览器中加载 `build/chrome-mv3-dev` 目录。

### 构建生产版本

```bash
pnpm build
```

构建完成后，可以在 `build/` 目录中找到生产版本。

## 🛠️ 技术栈

- **框架**: [Plasmo](https://docs.plasmo.com/) - 现代浏览器扩展开发框架
- **UI 库**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Plasmo Storage API
- **构建工具**: Plasmo CLI
- **代码质量**: ESLint + Prettier

## 📖 使用指南

### 🎯 账号类型选择 (v2.0.0+)

**首次使用建议**: 根据您的 PackyCode 账号情况选择合适的模式

#### 🚌 公交车模式（共享账号）
- **适用场景**: 使用传统 PackyCode 账号访问 `www.packycode.com`
- **特点**: 稳定成熟，大部分用户的首选
- **切换方式**: 扩展设置 → 账号版本 → 公交车

#### 🚗 滴滴车模式（私有账号）
- **适用场景**: 使用新型私有账号访问 `share.packycode.com`
- **特点**: 独立环境，专用域名，更好的隐私保护
- **切换方式**: 扩展设置 → 账号版本 → 滴滴车

> **💡 智能提示**: 扩展会自动检测您当前访问的域名，并建议最适合的账号模式

### 📱 基础功能使用

1. **一键开始**: 安装扩展后，点击扩展图标即可开始使用
2. **自动认证**: 扩展会根据您选择的账号类型，自动从对应网站获取登录状态
3. **实时监控**: 数据自动更新，无需手动操作即可获得最新使用情况

### 🔔 智能监控体验 (v1.5.0+)

- **Opus 模型状态**: 自动检测 Claude Opus 模型可用性变化
- **购买机会提醒**: 当 PackyCode 开放购买时立即通知
- **状态总览**: 在统一面板中查看认证、购买、Opus 三大状态
- **桌面通知**: 重要状态变化时发送系统级通知提醒

## 📚 技术文档

### 快速导航

- **[📖 完整文档中心](docs/README.md)** - 技术文档导航中心
- **[👨‍💻 开发者指南](docs/developers/)** - 贡献和编码规范
- **[📚 功能指南](docs/guides/)** - 版本化存储和滴滴车模式
- **[🏗️ 架构设计](docs/architecture/)** - 核心系统设计文档

### 常用文档

| 文档                                                      | 用途               | 读者     |
| --------------------------------------------------------- | ------------------ | -------- |
| [贡献指南](docs/developers/contributing.md)               | 参与项目开发       | 新贡献者 |
| [版本化存储指南](docs/guides/versioned-storage-guide.md)  | 理解双账号数据隔离 | 开发者   |
| [存储架构设计](docs/architecture/storage-architecture.md) | 深度技术设计       | 架构师   |

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [贡献指南](docs/developers/contributing.md) 了解详细信息。

### 开发流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 版本历史

### v2.0.0 (2025-08-24) - 🎯 多账号生态支持

这是一个里程碑版本！我们引入了完整的多账号类型支持，让用户可以根据自己的使用场景选择最合适的账号模式。

#### 🚀 核心新特性
- 🚌 **公交车模式**: 支持传统共享账号 (`www.packycode.com`)
- 🚗 **滴滴车模式**: 支持全新私有账号 (`share.packycode.com`)
- 🔄 **智能账号切换**: 一键在不同账号类型间切换，数据完全隔离
- 🛡️ **域名自适应**: 系统自动匹配对应的域名和 API 端点

#### 💎 用户体验升级
- 📱 **直观设置面板**: 简单明了的账号类型选择界面
- 🎯 **智能引导**: 根据用户访问的域名自动推荐最适合的模式
- 📊 **数据隔离**: 不同账号类型的数据完全独立存储，互不干扰
- ⚡ **无缝迁移**: 切换账号类型时保持用户体验的连续性

#### 🔧 稳定性改进
- 🛡️ **认证适配层**: 统一的认证逻辑，支持多域名环境
- 🔐 **API Key 自动检测**: 在滴滴车模式下完美支持 API Key 自动切换
- 📡 **智能网络处理**: 根据账号类型自动选择正确的网络配置

### v1.5.0 (2025-08-19) - Opus 模型状态监控

- 🎨 **Opus 模型检测**: 新增 Claude Opus 模型开放状态实时监控功能
- 🔔 **模型状态通知**: Opus 模型状态变化时自动推送桌面通知
- 📊 **统一状态面板**: 重新设计服务状态界面，整合认证、购买、Opus 三大状态
- 💰 **预算界面优化**: 合并日月预算展示，提升信息密度和空间利用率
- ⚡ **UI/UX 改进**: 优化按钮设计，采用现代化链接式操作风格
- 🔧 **技术架构**: 完善轮询机制，支持多状态并行监控

### v1.4.0 (2025-08-13) - 购买状态监控

- 🛒 **购买机会提醒**: 自动监控 PackyCode 购买开放状态，不再错过购买窗口
- 🔔 **即时桌面通知**: 购买开放时立即收到通知提醒，第一时间抢购
- 📱 **统一状态面板**: 在一个界面同时查看登录状态和购买可用性
- 🔄 **手动刷新**: 随时点击刷新按钮获取最新购买状态

### v1.3.0 (2025-07-29) - 增强认证体验

- 🔑 **API Key 支持**: 支持使用长期有效的 API Key，无需频繁重新登录
- 🔄 **智能认证**: 自动选择最佳认证方式，优先使用稳定的 API Key
- ✨ **无感切换**: 创建 API Key 后自动切换，无需手动配置
- 💡 **状态区分**: 清晰显示当前使用的认证方式和过期状态

### v1.2.0 (2025-07-09) - 界面体验升级

- ⏰ **预算重置提醒**: 显示每日预算重置倒计时，合理规划使用时间
- 🎨 **界面重构**: 全新模块化界面设计，操作更加直观流畅
- 📍 **布局优化**: 重新安排按钮位置，提升使用便捷性
- ⚡ **实时更新**: 数据刷新更加及时，信息始终保持最新状态

### v1.1.0 (2025-07-09) - 智能监控功能

- 🏷️ **图标徽章**: 扩展图标直接显示预算使用百分比，一目了然
- 🔄 **后台监控**: 自动后台刷新数据，无需手动操作
- 📊 **持续跟踪**: 即使不打开扩展也能持续监控使用情况

### v1.0.0 (2025-07-08) - 首个正式版本

- 💰 **预算监控**: 实时查看每日和每月 API 使用情况和余额
- 📊 **可视化展示**: 直观的进度条显示预算使用进度
- 🔒 **自动登录**: 无需手动配置，自动获取登录状态
- 🎨 **现代界面**: 简洁美观的用户界面设计

查看完整的 [版本更新历史](https://github.com/94mashiro/packycode-cost/releases)。

## 🐛 问题反馈

如果您遇到任何问题或有功能建议，请通过以下方式联系我们：

- [提交 Issue](https://github.com/94mashiro/packycode-cost/issues)
- [功能请求](https://github.com/94mashiro/packycode-cost/issues/new?template=feature_request.md)
- [Bug 报告](https://github.com/94mashiro/packycode-cost/issues/new?template=bug_report.md)

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 🔗 相关链接

- [PackyCode 官网](https://www.packycode.com)
- [Plasmo 文档](https://docs.plasmo.com/)
- [Chrome Extension 开发指南](https://developer.chrome.com/docs/extensions/)

## 💖 致谢

感谢所有为这个项目做出贡献的开发者和用户！

---

<div align="center">
  <p>如果这个项目对您有帮助，请给我们一个 ⭐️</p>
</div>
