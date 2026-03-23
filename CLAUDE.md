# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Context-Todos is an MCP (Model Context Protocol) server that scans and manages TODO/FIXME/HACK/XXX comments in codebases. It provides tools for scanning files/directories, watching for changes, and storing TODOs in a database.

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
- `scan-file.ts`, `scan-directory.ts`, `list-extensions.ts` - Available in all modes
- `watch.ts`, `list-todos.ts` - Available in max modes only
- `get-todo-stats.ts` - Available in labs-max mode only

### Server Modes
| Mode | CLI Flags | Features |
|------|-----------|----------|
| standard | (default) | Basic scanning tools |
| max | `--max` | + file watching + database persistence |
| labs-max | `--labs --max` | + experimental `get-todo-stats` tool |

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
