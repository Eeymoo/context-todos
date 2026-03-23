[English](./README.md) | **简体中文**

# Context-Todos

一个 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 服务器，用于扫描和管理代码库中的 TODO/FIXME/HACK/XXX 注释。

## 它是做什么的

Context-Todos 帮助你追踪和管理整个项目中的代码注释。它扫描源文件中的常见注释标签，并通过 MCP 协议提供查询、监视和分析工具。

### 功能特性

- **扫描文件**：从单个文件中提取 TODO 注释
- **扫描目录**：递归扫描目录中所有支持的文件
- **列出扩展名**：查看所有支持的文件扩展名
- **监视模式**：实时监控文件变化（`--max` / `--labs --max`）
- **TODO 数据库**：持久化存储所有 TODO 项（`--max` / `--labs --max`）
- **统计信息**：按标签和文件获取 TODO 统计（`--labs --max`）

### 支持的 TODO 标签

| 标签 | 用途 |
|------|------|
| `TODO` | 待完成的通用任务 |
| `FIXME` | 需要修复的代码 |
| `HACK` | 临时解决方案 |
| `XXX` | 警告或有问题的代码 |

### TODO 注释规范

我们推荐使用结构化的 TODO 注释格式，以提高可读性并实现更好的分类：

```
TODO: 简短描述
TODO(类别): 带类别的简短描述
```

`(类别)` 部分是**可选的**但**推荐使用**，以便更好地组织。两种格式都是有效的，都会被检测到。

#### 推荐的类别

| 类别 | 用途 |
|------|------|
| `bug` | 需要修复的 Bug |
| `performance` | 性能优化 |
| `security` | 安全相关问题 |
| `ux` | 用户体验改进 |
| `refactor` | 代码重构需求 |
| `docs` | 文档更新 |
| `test` | 缺失或改进测试 |
| `feat` | 新功能实现 |
| `build` | 构建/CI 相关问题 |

#### 各语言示例

**JavaScript / TypeScript / Node.js**
```javascript
// 简单格式
// TODO: 为网络超时添加错误处理

// 带类别格式
/*
 * TODO(performance): 将同步的 readdirSync 替换为异步的 fs.promises.readdir
 * 以避免扫描大型项目时阻塞事件循环。
 * 参考: https://nodejs.org/api/fs.html#fs_fspromises_readdir_path_options
 */
```

**Python**
```python
# 简单格式
# TODO: 为此函数添加类型注解

# 带类别格式
# TODO(security): 在数据库查询前对用户输入进行清理
# 考虑使用参数化查询而不是字符串格式化。
```

**Rust**
```rust
// 简单格式
// TODO: 为此结构体实现 Clone trait

// 带类别格式
/*
 * TODO(security): 添加输入验证以防止缓冲区溢出
 * 攻击发生在数据包解析器中。
 */
```

**Java**
```java
// 简单格式
// TODO: 将魔法数字提取为常量

// 带类别格式
/*
 * TODO(performance): 缓存计算结果以避免
 * 每次请求都重新计算。
 * 考虑使用 Caffeine 或 Guava 缓存。
 */
```

**C++**
```cpp
// 简单格式
// TODO: 为边界情况添加单元测试

// 带类别格式
/*
 * TODO(performance): 将原始指针替换为智能指针
 * 以防止内存泄漏并改善所有权语义。
 */
```

### 支持的文件扩展名

| 类别 | 扩展名 |
|------|--------|
| JavaScript/TypeScript | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` |
| Python | `.py` |
| Ruby | `.rb` |
| Java | `.java` |
| Go | `.go` |
| Rust | `.rs` |
| C/C++ | `.c`, `.cpp`, `.h`, `.hpp` |
| C# | `.cs` |
| PHP | `.php` |
| Swift | `.swift` |
| Kotlin/Scala | `.kt`, `.scala` |
| Shell | `.sh`, `.bash` |
| 前端 | `.css`, `.scss`, `.less`, `.html`, `.vue`, `.svelte` |
| 配置文件 | `.yaml`, `.yml`, `.toml`, `.ini`, `.cfg` |
| 数据库 | `.sql`, `.lua` |
| 其他 | `.r`, `.m`, `.mm`, `.pl`, `.pm`, `.ex`, `.exs`, `.erl`, `.hs`, `.elm`, `.clj`, `.cljs`, `.tf`, `.hcl`, `.dockerfile` |

## 如何使用

### 快速开始（npx）

```bash
# 使用 npx 直接运行（稳定版 Standard）
npx @eeymoo/context-todos mcp

# 稳定版 Max（带监视）
npx @eeymoo/context-todos mcp --max

# 实验版 Standard
npx @eeymoo/context-todos mcp --labs

# 实验版 Max（所有功能，包含实验性统计）
npx @eeymoo/context-todos mcp --labs --max
```

### 安装

```bash
# 全局安装
npm install -g @eeymoo/context-todos

# 或使用 pnpm
pnpm add -g @eeymoo/context-todos

# 然后运行
context-todos mcp
```

### 配置 MCP 客户端

添加到你的 MCP 客户端配置（如 Claude Desktop、Cursor 等）：

```json
{
  "mcpServers": {
    "context-todos": {
      "command": "npx",
      "args": ["-y", "@eeymoo/context-todos", "mcp"]
    }
  }
}
```

或使用其他模式：

```json
{
  "mcpServers": {
    "context-todos": {
      "command": "npx",
      "args": ["-y", "@eeymoo/context-todos", "mcp", "--max"]
    }
  }
}
```

### 开发

```bash
# 克隆仓库
git clone https://github.com/eeymoo/context-todos.git
cd context-todos

# 安装依赖
pnpm install

# 构建
pnpm build

# 开发模式运行
pnpm dev
```

### 服务器模式

产品有两类功能：

- **稳定版**：生产就绪的功能，有 `Standard` 和 `Max` 两个变体
- **实验版（Labs）**：实验性功能，同样有 `Standard` 和 `Max` 两个变体

| 类别 | 模式 | CLI | 描述 | 工具 |
|------|------|-----|------|------|
| 稳定版 | Standard | （默认） | 基础扫描工具 | `scan-file`, `scan-directory`, `list-supported-extensions` |
| 稳定版 | Max | `--max` | Standard + 文件监视和数据库 | 所有 standard + `watch`, `unwatch`, `list-todos` |
| 实验版 | Standard | `--labs` | 实验性标准模式 | 与稳定版 Standard 相同 |
| 实验版 | Max | `--labs --max` | 所有功能，包含实验性统计 | 所有 max + `get-todo-stats` |

```bash
# 稳定版 Standard（默认）
npx @eeymoo/context-todos mcp

# 稳定版 Max（带监视）
npx @eeymoo/context-todos mcp --max

# 实验版 Standard
npx @eeymoo/context-todos mcp --labs

# 实验版 Max（所有功能）
npx @eeymoo/context-todos mcp --labs --max
```

### MCP 工具

#### `scan-file`

扫描单个文件的 TODO 注释。

```json
{
  "name": "scan-file",
  "arguments": {
    "path": "/path/to/file.ts"
  }
}
```

#### `scan-directory`

递归扫描目录的 TODO 注释。

```json
{
  "name": "scan-directory",
  "arguments": {
    "path": "/path/to/project",
    "extensions": [".ts", ".js"]
  }
}
```

#### `list-supported-extensions`

列出所有支持的文件扩展名。

```json
{
  "name": "list-supported-extensions",
  "arguments": {}
}
```

#### `watch`（`--max` / `--labs --max`）

开始监视目录的文件变化。

```json
{
  "name": "watch",
  "arguments": {
    "path": "/path/to/project",
    "extensions": [".ts", ".js"]
  }
}
```

#### `unwatch`（`--max` / `--labs --max`）

停止监视。

```json
{
  "name": "unwatch",
  "arguments": {}
}
```

#### `list-todos`（`--max` / `--labs --max`）

从数据库列出所有跟踪的 TODO。

```json
{
  "name": "list-todos",
  "arguments": {
    "tag": "TODO",
    "file": "src/index.ts"
  }
}
```

#### `get-todo-stats`（仅 `--labs --max`）

获取按标签和文件分组的 TODO 统计信息。

```json
{
  "name": "get-todo-stats",
  "arguments": {}
}
```

### 脚本命令

```bash
pnpm dev           # 开发模式运行
pnpm build         # 生产构建
pnpm test          # 运行测试
pnpm test:watch    # 监视模式运行测试
pnpm inspector     # 使用 MCP inspector 运行（用于调试）
```

## 系统要求

- Node.js >= 18.0.0
- pnpm（推荐）

## 许可证

ISC
