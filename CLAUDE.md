# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Context-Todos is an MCP (Model Context Protocol) server that scans and manages TODO/FIXME/HACK/XXX comments in codebases. It provides tools for scanning files/directories, watching for changes, and storing TODOs in a database.

## Claude Code行为准则

1. **禁止直接向用户提问**：不得直接向用户提问，必须使用提问工具（AskUserQuestion）来收集用户偏好、澄清模糊指令或获取实施决策。
2. **完成确认**：一旦确认任务完成，必须使用提问工具让用户确认。用户如果对结果不满意，可以提出反馈意见，然后你可以根据反馈进行改进并再次尝试，之后必须再次使用提问工具让用户确认。
3. **使用MCP工具搜索TODO**：当需要搜索项目中的TODO/FIXME/HACK/XXX注释时，不得使用grep搜索，必须使用`@eeymoo/context-todos`这个MCP服务器提供的工具（如`scan-file`、`scan-directory`、`list-todos`）进行搜索。

## Commands

```bash
# Development
pnpm dev                  # Run MCP server in dev mode (tsx)
pnpm build                # Build TypeScript to dist/
pnpm start                # Run built server

# Testing
pnpm test                 # Run all tests with vitest
pnpm test:watch           # Run tests in watch mode
pnpm vitest run tests/scanner.test.ts  # Run specific test file

# MCP Debugging
pnpm inspector            # Run with MCP inspector (production build)
pnpm inspector:dev        # Run with MCP inspector (development)
```

## Architecture

### Entry Point
- `src/index.ts` - CLI entry using Commander. Parses `--max`, `--labs`, `--use-gitignore` flags and creates the MCP server with appropriate transport (stdio or SSE).

### Core Modules (`src/mcp/`)
- **`index.ts`** - Server factory. Registers tools based on mode, initializes database, sets up file watcher for max modes.
- **`types.ts`** - Core types (`TodoItem`, `ServerMode`, `ModeConfig`) and mode configuration mapping.
- **`scanner.ts`** - Uses `leasot` library to parse TODO comments from files. `collectFiles()` walks directories recursively.
- **`db.ts`** - SQLite database layer using `@libsql/client`. Handles TODO persistence with `syncFileTodos()`, `queryTodos()`, `getTodoStats()`.
- **`gitignore.ts`** - Optional gitignore filtering using the `ignore` package.

### Tools (`src/mcp/tools/`)
Each tool is a self-contained module that registers itself with the McpServer:
- `scan-file.ts`, `list-extensions.ts` - Available in all modes
- `scan-directory.ts` - Available in labs modes only (experimental)
- `watch.ts`, `list-todos.ts` - Available in max modes only
- `get-todo-stats.ts` - Available in labs-max mode only

### Server Modes

The server supports four modes based on two dimensions:
- **Basic vs Full**: `--max` flag enables file watching and database persistence
- **Standard vs Experimental**: `--labs` flag enables experimental features

| Mode | CLI Flags | Features |
|------|-----------|----------|
| standard | (default) | Basic scanning tools (scan-file, list-extensions) |
| labs-standard | `--labs` | Basic scanning tools + scan-directory (experimental) |
| max | `--max` | + file watching + database persistence |
| labs-max | `--labs --max` | + file watching + database persistence + get-todo-stats |

### Output Format
Use the `--format` option to change output format: `toon` (default, compact), `json` (structured), or `pretty` (human-readable with indentation).

### File Filtering
- `--filter <patterns>`: Comma-separated glob patterns to exclude (e.g., `"*.test.ts,*.spec.ts"`)
- `--use-gitignore`: Use .gitignore to filter files (default: true)
- `--gitignore-path <path>`: Custom gitignore file path

### Database
- SQLite via libsql, stored as `.context-todos.db` in the watched directory
- Schema: `todos(id, file, tag, line, ref, text, created_at, updated_at)`
- Unique constraint on `(file, line, tag)`

## Key Dependencies

- `@modelcontextprotocol/sdk` - MCP server implementation
- `leasot` - TODO comment parsing (supports 40+ file extensions)
- `chokidar` - File watching
- `@libsql/client` - SQLite database
- `commander` - CLI argument parsing
- `zod` - Input schema validation for MCP tools
