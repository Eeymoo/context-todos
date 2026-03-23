import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getTodoStats } from '../db.js';

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

        const tagLines = stats.byTag
          .map((t) => `  ${t.tag}: ${t.count}`)
          .join('\n');

        const categoryLines = stats.byCategory.length > 0
          ? stats.byCategory.map((c) => `  ${c.category}: ${c.count}`).join('\n')
          : '  (none)';

        const fileLines = stats.byFile
          .map((f) => `  ${f.file}: ${f.count}`)
          .join('\n');

        const text = `Total TODOs: ${stats.total}\n\nBy Tag:\n${tagLines}\n\nBy Category:\n${categoryLines}\n\nTop Files:\n${fileLines}`;

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
