import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { createWatcher } from '../watcher.js';

export function registerWatchTools(server: McpServer) {
  const watcher = createWatcher();

  server.registerTool(
    'start-watching',
    {
      title: 'Start Watching for TODO Changes',
      description: 'Start watching a file or directory for changes. When files are added, modified, or deleted, their TODO comments are automatically re-scanned. Skips node_modules, .git, and dist.',
      inputSchema: z.object({
        path: z
          .string()
          .describe('File or directory path to watch (default: current directory)')
          .optional(),
        extensions: z
          .array(z.string())
          .describe('Filter by file extensions, e.g. [".ts", ".js"]. If omitted, watches all supported extensions.')
          .optional(),
      }),
    },
    async ({ path, extensions }) => {
      try {
        await watcher.start(path ?? '.', extensions);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Started watching: ${path ?? '.'}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error starting watcher: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    'stop-watching',
    {
      title: 'Stop Watching',
      description: 'Stop the active file watcher.',
    },
    async () => {
      if (!watcher.watching) {
        return {
          content: [
            { type: 'text' as const, text: 'No active watcher to stop.' },
          ],
        };
      }

      await watcher.stop();
      return {
        content: [
          { type: 'text' as const, text: 'Watcher stopped.' },
        ],
      };
    },
  );

  server.registerTool(
    'get-watched-changes',
    {
      title: 'Get Watched File Changes',
      description: 'Retrieve TODO changes detected by the watcher since a given timestamp. Returns file change events with their updated TODO lists.',
      inputSchema: z.object({
        since: z
          .number()
          .describe('Unix timestamp (ms). Only return changes after this time. If omitted, returns all buffered changes.')
          .optional(),
        clear: z
          .boolean()
          .describe('Clear the change buffer after reading (default: false)')
          .optional(),
      }),
    },
    async ({ since, clear }) => {
      if (!watcher.watching) {
        return {
          content: [
            { type: 'text' as const, text: 'No active watcher. Call start-watching first.' },
          ],
        };
      }

      const changes = watcher.getChanges(since);

      if (clear) {
        watcher.clearChanges();
      }

      if (changes.length === 0) {
        return {
          content: [
            { type: 'text' as const, text: 'No changes detected.' },
          ],
        };
      }

      const formatted = changes
        .map((c) => {
          const todoCount = c.todos.length;
          const todoPart = todoCount > 0
            ? ' (' + todoCount + ' TODO' + (todoCount > 1 ? 's' : '') + ')'
            : '';
          return '[' + c.type.toUpperCase() + '] ' + c.path + todoPart;
        })
        .join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: `${changes.length} change(s) detected:\n\n${formatted}`,
          },
        ],
      };
    },
  );
}
