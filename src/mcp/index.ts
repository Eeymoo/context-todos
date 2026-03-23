import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { resolve, relative } from 'node:path';
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
import { createGitignoreFilter, type GitignoreFilter } from './gitignore.js';

export async function createServer(options: ServerOptions = { mode: 'standard' }) {
  const { mode } = options;
  const config = modeConfigs[mode];

  const watchPath = resolve(options.watchPath ?? '.');
  const gitignoreFilter: GitignoreFilter = options.useGitignore
    ? createGitignoreFilter(watchPath, options.gitignorePath)
    : { ignores: () => false, ignoresDir: () => false };

  const server = new McpServer(
    { name: 'context-todos', version: '1.0.0' },
    { capabilities: { logging: {} } },
  );

  registerScanFile(server);
  registerScanDirectory(server);
  registerListExtensions(server);

  if (config.enableWatcher) {
    registerWatchTools(server, gitignoreFilter);
  }

  if (config.enableDatabase) {
    registerListTodos(server);
    await initDb(watchPath);

    const files = collectFiles(watchPath, undefined, gitignoreFilter);
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
        if (gitignoreFilter.ignores(relPath)) return true;
        if (stats?.isFile() && options.extensions) {
          /*
           * TODO(bug): Using string split for extension extraction is unreliable.
           * For files like 'archive.tar.gz' or 'component.test.tsx', this returns
           * only the last segment ('.gz' or '.tsx') instead of the full extension.
           * Should use extname() from 'node:path' for consistent behavior.
           * Example fix: const ext = extname(fp);
           */
          const ext = '.' + fp.split('.').pop();
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
      registerGetTodoStats(server);
    }

    return { server, totalTodos };
  }

  return { server, totalTodos: 0 };
}
