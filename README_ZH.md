# Context-Todos

一个 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 服务器，用于扫描和管理代码库中的 TODO/FIXME/HACK/XXX 注释。

## 它是做什么的

Context-Todos 帮助你追踪和管理整个项目中的代码注释。它扫描源文件中的常见注释标签，并通过 MCP 协议提供查询、监视和分析工具。

### 功能特性

- **扫描文件**：从单个文件中提取 TODO 注释
- **扫描目录**：递归扫描目录中所有支持的文件
- **列出扩展名**：查看所有支持的文件扩展名
- **监视模式**：实时监控文件变化（max/labs 模式）
- **TODO 数据库**：持久化存储所有 TODO 项（max/labs 模式）
- **统计信息**：按标签和文件获取 TODO 统计（labs 模式）

### 支持的 TODO 标签

| 标签 | 用途 |
|------|------|
| `TODO` | 待完成的通用任务 |
| `FIXME` | 需要修复的代码 |
| `HACK` | 临时解决方案 |
| `XXX` | 警告或有问题的代码 |

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
# 使用 npx 直接运行
npx @eeymoo/context-todos mcp

# 带选项运行
npx @eeymoo/context-todos mcp --max
npx @eeymoo/context-todos mcp --labs
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

或使用 max/labs 模式：

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

| 模式 | 描述 | 可用工具 |
|------|------|----------|
| `standard` | 基础扫描工具 | `scan-file`, `scan-directory`, `list-supported-extensions` |
| `max` | 增加文件监视和数据库 | 所有 standard + `watch`, `unwatch`, `list-todos` |
| `labs` | 实验模式，包含统计功能 | 所有 max + `get-todo-stats` |

```bash
# 标准模式（默认）
node dist/index.js mcp

# Max 模式（带监视）
node dist/index.js mcp --mode max

# Labs 模式（完整功能）
node dist/index.js mcp --mode labs
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

#### `watch`（max/labs 模式）

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

#### `unwatch`（max/labs 模式）

停止监视。

```json
{
  "name": "unwatch",
  "arguments": {}
}
```

#### `list-todos`（max/labs 模式）

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

#### `get-todo-stats`（labs 模式）

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
