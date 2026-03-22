# Context-Todos

[简体中文](./README_ZH.md) | English

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that scans and manages TODO/FIXME/HACK/XXX comments in your codebase.

## What It Does

Context-Todos helps you track and manage code annotations across your entire project. It scans source files for common comment tags and provides tools to query, watch, and analyze them through the MCP protocol.

### Features

- **Scan Files**: Extract TODO comments from a single file
- **Scan Directories**: Recursively scan all supported files in a directory
- **List Extensions**: View all supported file extensions
- **Watch Mode**: Real-time monitoring of file changes (max/labs mode)
- **TODO Database**: Persistent storage of all TODO items (max/labs mode)
- **Statistics**: Get TODO statistics by tag and file (labs mode)

### Supported TODO Tags

| Tag | Usage |
|-----|-------|
| `TODO` | General tasks to be done |
| `FIXME` | Code that needs to be fixed |
| `HACK` | Temporary workarounds |
| `XXX` | Warning or problematic code |

### Supported File Extensions

| Category | Extensions |
|----------|------------|
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
| Frontend | `.css`, `.scss`, `.less`, `.html`, `.vue`, `.svelte` |
| Config | `.yaml`, `.yml`, `.toml`, `.ini`, `.cfg` |
| Database | `.sql`, `.lua` |
| Other | `.r`, `.m`, `.mm`, `.pl`, `.pm`, `.ex`, `.exs`, `.erl`, `.hs`, `.elm`, `.clj`, `.cljs`, `.tf`, `.hcl`, `.dockerfile` |

## How to Use

### Quick Start (npx)

```bash
# Run directly with npx (Stable Standard)
npx @eeymoo/context-todos mcp

# Stable Max (with watching)
npx @eeymoo/context-todos mcp --max

# Labs Standard
npx @eeymoo/context-todos mcp --labs

# Labs Max (all features including experimental)
npx @eeymoo/context-todos mcp --labs --max
```

### Installation

```bash
# Install globally
npm install -g @eeymoo/context-todos

# Or with pnpm
pnpm add -g @eeymoo/context-todos

# Then run
context-todos mcp
```

### Configure MCP Client

Add to your MCP client configuration (e.g., Claude Desktop, Cursor, etc.):

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

Or with max/labs mode:

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

### Development

```bash
# Clone the repository
git clone https://github.com/eeymoo/context-todos.git
cd context-todos

# Install dependencies
pnpm install

# Build
pnpm build

# Run in development
pnpm dev
```

### Server Modes

The product has two categories of features:

- **Stable**: Production-ready features with `Standard` and `Max` variants
- **Labs**: Experimental features, also with `Standard` and `Max` variants

| Category | Mode | CLI | Description | Tools |
|----------|------|-----|-------------|-------|
| Stable | Standard | (default) | Basic scanning tools | `scan-file`, `scan-directory`, `list-supported-extensions` |
| Stable | Max | `--max` | Standard + file watching & database | All standard + `watch`, `unwatch`, `list-todos` |
| Labs | Standard | `--labs` | Experimental standard mode | Same as Stable Standard |
| Labs | Max | `--labs --max` | All features including experimental | All max + `get-todo-stats` |

```bash
# Stable Standard (default)
npx @eeymoo/context-todos mcp

# Stable Max (with watching)
npx @eeymoo/context-todos mcp --max

# Labs Standard
npx @eeymoo/context-todos mcp --labs

# Labs Max (all features)
npx @eeymoo/context-todos mcp --labs --max
```

### MCP Tools

#### `scan-file`

Scan a single file for TODO comments.

```json
{
  "name": "scan-file",
  "arguments": {
    "path": "/path/to/file.ts"
  }
}
```

#### `scan-directory`

Recursively scan a directory for TODO comments.

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

List all supported file extensions.

```json
{
  "name": "list-supported-extensions",
  "arguments": {}
}
```

#### `watch` (max / labs --max)

Start watching a directory for file changes.

```json
{
  "name": "watch",
  "arguments": {
    "path": "/path/to/project",
    "extensions": [".ts", ".js"]
  }
}
```

#### `unwatch` (max / labs --max)

Stop watching.

```json
{
  "name": "unwatch",
  "arguments": {}
}
```

#### `list-todos` (max / labs --max)

List all tracked TODOs from the database.

```json
{
  "name": "list-todos",
  "arguments": {
    "tag": "TODO",
    "file": "src/index.ts"
  }
}
```

#### `get-todo-stats` (labs --max only)

Get TODO statistics grouped by tag and file.

```json
{
  "name": "get-todo-stats",
  "arguments": {}
}
```

### Scripts

```bash
pnpm dev           # Run in development mode
pnpm build         # Build for production
pnpm test          # Run tests
pnpm test:watch    # Run tests with watch mode
pnpm inspector     # Run with MCP inspector (for debugging)
```

## Requirements

- Node.js >= 18.0.0
- pnpm (recommended)

## License

ISC
