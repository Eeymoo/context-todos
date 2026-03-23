import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolve, relative, extname } from 'node:path';
import { watch } from 'chokidar';
import { registerScanFile } from './tools/scan-file.js';
import { registerScanDirectory } from './tools/scan-directory.js';
import { registerListExtensions } from './tools/list-extensions.js';
import { registerWatchTools } from './tools/watch.js';
import { registerListTodos } from './tools/list-todos.js';
import { registerGetTodoStats } from './tools/get-todo-stats.js';
import { initDb, syncFileTodos, removeFileTodos } from './db.js';
import { collectFiles, scanFile } from './scanner.js';
import type { ServerOptions } from './types.js';
import { modeConfigs } from './types.js';
import { createGitignoreFilter, createCustomFilter, combineFilters, type GitignoreFilter } from './gitignore.js';
import { createFormatter, type Formatter } from './formatter.js';

export async function createServer(options: ServerOptions = { mode: 'standard' }) {
  const { mode } = options;
  const config = modeConfigs[mode];

  const watchPath = resolve(options.watchPath ?? '.');

  const formatter: Formatter = createFormatter(options.format);

  const gitignoreFilter: GitignoreFilter | null = options.useGitignore
    ? createGitignoreFilter(watchPath, options.gitignorePath)
    : null;

  const customFilter: GitignoreFilter | null = options.filter
    ? createCustomFilter(options.filter)
    : null;

  const combinedFilter = combineFilters(gitignoreFilter, customFilter);

  const server = new McpServer(
    { name: 'context-todos', version: '1.0.0' },
    { capabilities: { logging: {} } },
  );

  registerScanFile(server, formatter);
  registerScanDirectory(server, formatter);
  registerListExtensions(server);

  if (config.enableWatcher) {
    registerWatchTools(server, combinedFilter);
  }

  if (config.enableDatabase) {
    registerListTodos(server, formatter);
    await initDb(watchPath);

    const files = await collectFiles(watchPath, undefined, combinedFilter);
    let totalTodos = 0;
    for (const file of files) {
      const todos = await scanFile(file);
      if (todos.length > 0) {
        const relFile = relative(watchPath, file);
        const relTodos = todos.map((t) => ({ ...t, file: relFile }));
        await syncFileTodos(relFile, relTodos);
        totalTodos += todos.length;
      }
    }

    const dbWatcher = watch(watchPath, {
      ignored: (fp: string, stats?: { isFile(): boolean }) => {
        const relPath = relative(watchPath, fp);
        if (combinedFilter.ignores(relPath)) return true;
        if (stats?.isFile() && options.extensions) {
          const ext = extname(fp);
          return !options.extensions.includes(ext);
        }
        return false;
      },
      persistent: true,
      ignoreInitial: true,
    });

    dbWatcher
      .on('add', (p: string) => {
        void (async () => {
          const relPath = relative(watchPath, p);
          try {
            const todos = await scanFile(p);
            await syncFileTodos(relPath, todos.map((t) => ({ ...t, file: relPath })));
          } catch { /* file may be temporarily unreadable */ }
        })();
      })
      .on('change', (p: string) => {
        void (async () => {
          const relPath = relative(watchPath, p);
          try {
            const todos = await scanFile(p);
            await syncFileTodos(relPath, todos.map((t) => ({ ...t, file: relPath })));
          } catch { /* file may be temporarily unreadable */ }
        })();
      })
      .on('unlink', (p: string) => {
        void removeFileTodos(relative(watchPath, p));
      });

    if (config.enableGetTodoStats) {
      registerGetTodoStats(server, formatter);
    }

    return { server, totalTodos };
  }

  return { server, totalTodos: 0 };
}
