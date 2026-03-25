/**
 * Get todo stats MCP tool.
 *
 * Provides the MCP tool interface for retrieving aggregated statistics
 * of persisted TODOs. Uses shared getTodoStatsOperation for core logic.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getTodoStatsOperation } from '../operations/get-todo-stats.js';
import { getFormatter } from '../formatter.js';

/**
 * Register the get-todo-stats MCP tool.
 *
 * @param server - The MCP server instance to register the tool with
 *
 * @example
 * const server = new McpServer({ name: 'todos', version: '1.0.0' });
 * registerGetTodoStats(server);
 */
export function registerGetTodoStats(server: McpServer) {
  server.registerTool(
    'get-todo-stats',
    {
      title: 'Get TODO Statistics',
      description: 'Returns aggregated statistics of all persisted TODOs: total count, breakdown by tag, category, and top files by TODO count.',
    },
    async () => {
      const result = await getTodoStatsOperation();

      if (!result.success) {
        return {
          content: [{ type: 'text' as const, text: result.error }],
        };
      }

      const stats = result.data;

      if (stats.total === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No TODOs in database.' }],
        };
      }

      const formattedStats = {
        total: stats.total,
        byTag: Object.fromEntries(stats.byTag.map(t => [t.tag, t.count])),
        byCategory: Object.fromEntries(stats.byCategory.map(c => [c.category ?? '(none)', c.count])),
        topFiles: stats.byFile.map(f => ({ file: f.file, count: f.count })),
      };

      const text = getFormatter().formatStats(formattedStats);

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );
}
