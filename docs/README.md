# PackyCode Cost Monitor - 技术文档中心

> 结合 **Linus Torvalds 系统工程思维** 和 **Dan Abramov 开发者体验理念** 的文档架构

## 📖 文档导航

### 🚀 快速开始

- [README.md](../README.md) - 项目概览和安装指南
- [CLAUDE.md](../CLAUDE.md) - AI 开发助手指南

### 👨‍💻 开发者指南

- [贡献指南](developers/contributing.md) - 如何参与项目开发
- [编码标准](developers/coding-standards.md) - 代码规范和最佳实践

### 📚 功能指南

- [版本化存储系统](guides/versioned-storage-guide.md) - 双账号数据隔离架构
- [私家车模式指南](guides/private-car-mode.md) - 私有账号认证配置

### 🏗️ 架构设计

- [存储架构设计](architecture/storage-architecture.md) - 核心存储系统设计
- [日志通信机制](architecture/log-bridge-design.md) - 统一调试日志系统

---

## 🎯 文档设计哲学

### Linus Torvalds 系统思维 🐧

- **简洁性优先**: 每个文档专注解决一个明确问题
- **实用导向**: 提供可执行的解决方案，而非抽象理论
- **渐进式深入**: 从系统概览到具体实现细节

### Dan Abramov 开发体验 ⚛️

- **开发者友好**: 清晰的导航和快速上手路径
- **认知负担最小**: 合理的信息层次和跨文档引用
- **实例驱动**: 丰富的代码示例和使用场景

---

## 📂 文档结构说明

```
docs/
├── README.md                    # 文档导航中心
├── developers/                  # 开发者资源
│   ├── contributing.md          # 贡献指南
│   └── coding-standards.md      # 编码规范
├── guides/                      # 功能使用指南
│   ├── versioned-storage-guide.md
│   └── private-car-mode.md
└── architecture/                # 技术架构文档
    ├── storage-architecture.md
    └── log-bridge-design.md
```

### 文档分类原则

- **developers/**: 面向贡献者的开发流程和规范
- **guides/**: 面向用户和开发者的功能使用说明
- **architecture/**: 面向架构师和高级开发者的系统设计文档

---

## 🔗 快速链接

| 文档类型                                             | 目标读者 | 核心价值         |
| ---------------------------------------------------- | -------- | ---------------- |
| [Contributing](developers/contributing.md)           | 新贡献者 | 快速参与项目开发 |
| [Storage Guide](guides/versioned-storage-guide.md)   | 开发者   | 理解数据隔离机制 |
| [Architecture](architecture/storage-architecture.md) | 架构师   | 深度技术设计细节 |

---

## 💡 使用建议

1. **初次接触项目**: 从 [README.md](../README.md) 开始
2. **参与开发**: 阅读 [贡献指南](developers/contributing.md)
3. **深度定制**: 参考 [架构设计](architecture/) 文档
4. **特定功能**: 查看 [功能指南](guides/) 对应文档

---

<div align="center">
  <p><em>文档即代码，代码即文档</em> - 高质量文档是优秀项目的标志</p>
</div>
