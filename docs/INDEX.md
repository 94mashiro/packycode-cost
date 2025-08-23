# 📚 PackyCode Cost Monitor - 完整文档索引

> 基于 **Linus Torvalds 系统工程思维** 和 **Dan Abramov 开发者体验理念** 设计的文档体系

## 🎯 快速导航

### 按读者类型

| 角色         | 推荐阅读路径            | 核心文档                                         |
| ------------ | ----------------------- | ------------------------------------------------ |
| **新用户**   | README → 功能指南       | [项目概览](../README.md)                         |
| **新贡献者** | Contributing → 编码标准 | [贡献指南](developers/contributing.md)           |
| **开发者**   | 功能指南 → 架构设计     | [存储系统](guides/versioned-storage-guide.md)    |
| **架构师**   | 架构设计 → 技术细节     | [存储架构](architecture/storage-architecture.md) |

### 按功能模块

| 功能           | 用户指南                                                    | 技术文档                                              |
| -------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| **双账号支持** | [版本化存储系统](guides/versioned-storage-guide.md)         | [存储架构设计](architecture/storage-architecture.md)  |
| **私家车模式** | [私家车模式指南](guides/private-car-mode.md)                | [账号适配层设计](guides/private-car-mode.md#架构说明) |
| **调试工具**   | [开发者工具使用](guides/private-car-mode.md#开发者测试工具) | [日志通信机制](architecture/log-bridge-design.md)     |

---

## 📂 完整文档结构

### 🏠 项目根目录

- **[README.md](../README.md)** - 项目概览、功能特性、快速开始
- **[CLAUDE.md](../CLAUDE.md)** - AI 开发助手指南和项目规范

### 👨‍💻 开发者资源 (`developers/`)

- **[README.md](developers/README.md)** - 开发者指南目录
- **[contributing.md](developers/contributing.md)** - 贡献流程和开发环境设置
- **[coding-standards.md](developers/coding-standards.md)** - 代码规范和最佳实践

### 📚 功能指南 (`guides/`)

- **[README.md](guides/README.md)** - 功能指南目录
- **[versioned-storage-guide.md](guides/versioned-storage-guide.md)** - 版本化存储系统详解
- **[private-car-mode.md](guides/private-car-mode.md)** - 私家车模式配置和使用

### 🏗️ 架构设计 (`architecture/`)

- **[README.md](architecture/README.md)** - 架构设计目录
- **[storage-architecture.md](architecture/storage-architecture.md)** - 存储系统架构深度分析
- **[log-bridge-design.md](architecture/log-bridge-design.md)** - 统一日志通信机制设计

---

## 🎨 文档设计哲学

### Linus Torvalds 系统思维 🐧

- **简洁性优先**: 每个文档解决一个明确问题
- **实用导向**: 提供可执行的解决方案
- **渐进式深入**: 从概览到实现细节的清晰层次

### Dan Abramov 用户体验 ⚛️

- **开发者友好**: 清晰的导航和快速上手路径
- **认知负担最小**: 合理的信息组织和跨文档引用
- **示例驱动**: 丰富的代码示例和使用场景

---

## 🔍 文档特色

### 跨文档关联

每个文档都包含相关文档引用，形成完整的知识网络：

- **功能指南** ↔ **架构设计**: 从使用到实现的双向关联
- **开发者资源** → **技术文档**: 从流程到技术的自然过渡
- **入门文档** → **深度文档**: 渐进式学习路径

### 设计洞察

文档中的 `★ Insight` 区块提供深度技术见解，解释设计决策的背景和权衡考量。

### 导航体系

- **文档内导航**: 每个文档底部的相关链接
- **目录导航**: 每个分类的 README.md 提供概览
- **中心导航**: 主文档中心 [docs/README.md](README.md) 统一入口

---

## 📊 文档统计

| 分类       | 文档数量 | 总行数       | 主要内容             |
| ---------- | -------- | ------------ | -------------------- |
| 开发者资源 | 2        | ~400 行      | 贡献流程、编码规范   |
| 功能指南   | 2        | ~420 行      | 存储系统、账号模式   |
| 架构设计   | 2        | ~700 行      | 系统架构、设计细节   |
| **总计**   | **8**    | **~1520 行** | **完整技术文档体系** |

---

## 🚀 使用建议

### 首次接触项目

1. [README.md](../README.md) - 了解项目概况
2. [docs/README.md](README.md) - 浏览文档结构
3. 根据角色选择对应的阅读路径

### 参与开发

1. [贡献指南](developers/contributing.md) - 开发流程
2. [版本化存储系统](guides/versioned-storage-guide.md) - 核心功能理解
3. [存储架构设计](architecture/storage-architecture.md) - 深度技术细节

### 功能定制

1. [功能指南](guides/) - 理解现有功能实现
2. [架构设计](architecture/) - 掌握系统设计原理
3. [编码标准](developers/coding-standards.md) - 遵循项目规范

---

<div align="center">
  <p><strong>文档即代码，架构即文档</strong></p>
  <p><em>高质量文档是优秀项目的标志</em></p>
</div>
