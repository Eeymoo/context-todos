import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { queryTodos } from '../db.js';
import type { Formatter } from '../formatter.js';

export function registerListTodos(server: McpServer, formatter: Formatter) {
  server.registerTool(
    'list-todos',
    {
      title: 'List TODOs from Database',
      description: 'Query persisted TODOs from the database. Supports filtering by tag, category, and file, ordered by most recently updated.',
      inputSchema: z.object({
        tag: z.string().describe('Filter by tag (e.g. "TODO", "FIXME", "HACK")').optional(),
        file: z.string().describe('Filter by file path (partial match)').optional(),
        category: z.string().describe('Filter by category (e.g. "feat", "bug", "ux")').optional(),
        limit: z.number().describe('Maximum number of results (default: 100)').optional(),
        offset: z.number().describe('Offset for pagination (default: 0)').optional(),
      }),
    },
    async (params) => {
      try {
        const query: Parameters<typeof queryTodos>[0] = {};
        if (params.tag !== undefined) query.tag = params.tag;
        if (params.file !== undefined) query.file = params.file;
        if (params.category !== undefined) query.category = params.category;
        if (params.limit !== undefined) query.limit = params.limit;
        if (params.offset !== undefined) query.offset = params.offset;

        const { todos, total } = await queryTodos(query);

        if (todos.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'No TODOs found in database.' }],
          };
        }

        const formatted = formatter.formatTodos(todos);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Showing ${todos.length} of ${total} TODO(s):\n\n${formatted}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error querying TODOs: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );
}
