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

### TODO Comment Convention

We recommend using a structured format for TODO comments to improve readability and enable better categorization:

```
TODO: Brief description
TODO(category): Brief description with category
```

The `(category)` part is **optional** but **recommended** for better organization. Both formats are valid and will be detected.

#### Recommended Categories

| Category | Purpose |
|----------|---------|
| `bug` | Bugs that need to be fixed |
| `performance` | Performance improvements |
| `security` | Security-related issues |
| `ux` | User experience improvements |
| `refactor` | Code refactoring needs |
| `docs` | Documentation updates |
| `test` | Missing or improved tests |
| `feat` | New features to implement |
| `build` | Build/CI related issues |

#### Examples by Language

**JavaScript / TypeScript / Node.js**
```javascript
// Simple format
// TODO: Add error handling for network timeouts

// With category
/*
 * TODO(performance): Replace synchronous readdirSync with async fs.promises.readdir
 * to avoid blocking the event loop when scanning large projects.
 * See: https://nodejs.org/api/fs.html#fs_fspromises_readdir_path_options
 */
```

**Python**
```python
# Simple format
# TODO: Add type hints to this function

# With category
# TODO(security): Sanitize user input before database query
# Consider using parameterized queries instead of string formatting.
```

**Rust**
```rust
// Simple format
// TODO: Implement Clone trait for this struct

// With category
/*
 * TODO(security): Add input validation to prevent buffer overflow
 * attacks in the packet parser.
 */
```

**Java**
```java
// Simple format
// TODO: Extract magic numbers to constants

// With category
/*
 * TODO(performance): Cache the computed results to avoid
 * recalculating on every request.
 * Consider using Caffeine or Guava cache.
 */
```

**C++**
```cpp
// Simple format
// TODO: Add unit tests for edge cases

// With category
/*
 * TODO(performance): Replace raw pointers with smart pointers
 * to prevent memory leaks and improve ownership semantics.
 */
```

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

### Output Format

Use the `--format` option to change the output format:

```bash
# Default format (toon) - compact single-line format
npx @eeymoo/context-todos mcp --format toon

# JSON format - structured JSON output
npx @eeymoo/context-todos mcp --format json

# Pretty format - human-readable with indentation
npx @eeymoo/context-todos mcp --format pretty
```

| Format | Description |
|--------|-------------|
| `toon` | Compact single-line format (default) |
| `json` | Full JSON structure for programmatic use |
| `pretty` | Multi-line format with indentation |

### File Filtering

Use `--filter` to exclude files matching specific patterns:

```bash
# Exclude test files
npx @eeymoo/context-todos mcp --filter "*.test.ts,*.spec.ts"

# Exclude test directories and config files
npx @eeymoo/context-todos mcp --filter "__tests__/**,*.config.ts"

# Combine with gitignore (enabled by default)
npx @eeymoo/context-todos mcp --use-gitignore --filter "*.test.ts"
```

| Option | Description |
|--------|-------------|
| `--filter <patterns>` | Comma-separated glob patterns to exclude |
| `--use-gitignore` | Use .gitignore to filter files (default: true) |
| `--gitignore-path <path>` | Custom gitignore file path |

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
