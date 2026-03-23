import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getTodoStats } from '../db.js';
import { getFormatter } from '../formatter.js';

export function registerGetTodoStats(server: McpServer) {
  server.registerTool(
    'get-todo-stats',
    {
      title: 'Get TODO Statistics',
      description: 'Returns aggregated statistics of all persisted TODOs: total count, breakdown by tag, category, and top files by TODO count.',
    },
    async () => {
      try {
        const stats = await getTodoStats();

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
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error getting TODO stats: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );
}
