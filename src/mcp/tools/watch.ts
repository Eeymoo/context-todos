/**
 * Watch MCP tools.
 *
 * Provides MCP tool interfaces for file watching operations.
 * Uses shared watchStartOperation for start-watching tool.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { createWatcher } from '../watcher.js';
import { watchStartOperation } from '../operations/watch.js';
import type { GitignoreFilter } from '../gitignore.js';
import type { ScanFileOptions } from '../scanner.js';

/**
 * Register watch-related MCP tools.
 *
 * @param server - The MCP server instance to register tools with
 * @param gitignoreFilter - Optional gitignore filter for file exclusion
 * @param scanOptions - Optional scan options for TODO parsing
 *
 * @example
 * const server = new McpServer({ name: 'todos', version: '1.0.0' });
 * registerWatchTools(server, gitignoreFilter, { blockComment: true });
 */
export function registerWatchTools(
  server: McpServer,
  gitignoreFilter?: GitignoreFilter,
  scanOptions?: ScanFileOptions
) {
  // Create shared watcher instance for all watch tools
  const watcherOptions = gitignoreFilter
    ? { gitignoreFilter, ...(scanOptions && { scanOptions }) }
    : scanOptions
      ? { scanOptions }
      : undefined;
  const watcher = createWatcher(watcherOptions);

  server.registerTool(
    'start-watching',
    {
      title: 'Start Watching for TODO Changes',
      description: 'Start watching a file or directory for changes. When files are added, modified, or deleted, their TODO comments are automatically re-scanned.',
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
      // Build input for watchStartOperation
      const input: Parameters<typeof watchStartOperation>[0] = {
        path: path ?? '.',
        ...(extensions && { extensions }),
        ...(gitignoreFilter && { gitignoreFilter }),
        ...(scanOptions && { scanOptions }),
        watcher,
      };

      const result = await watchStartOperation(input);

      if (!result.success) {
        return {
          content: [
            {
              type: 'text' as const,
              text: result.error,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Started watching: ${result.data.path}`,
          },
        ],
      };
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
