/**
 * List todos MCP tool.
 *
 * Provides the MCP tool interface for querying persisted TODOs from database.
 * Uses shared listTodosOperation for core logic.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { listTodosOperation } from '../operations/list-todos.js';
import { getFormatter } from '../formatter.js';

/**
 * Register the list-todos MCP tool.
 *
 * @param server - The MCP server instance to register the tool with
 *
 * @example
 * const server = new McpServer({ name: 'todos', version: '1.0.0' });
 * registerListTodos(server);
 */
export function registerListTodos(server: McpServer) {
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
      // Build input object with only defined values
      const input: Parameters<typeof listTodosOperation>[0] = {
        config: {},
      };
      if (params.tag !== undefined) input.tag = params.tag;
      if (params.file !== undefined) input.file = params.file;
      if (params.category !== undefined) input.category = params.category;
      if (params.limit !== undefined) input.limit = params.limit;
      if (params.offset !== undefined) input.offset = params.offset;

      const result = await listTodosOperation(input);

      if (!result.success) {
        return {
          content: [{ type: 'text' as const, text: result.error }],
        };
      }

      const { todos, total, count } = result.data;

      if (count === 0) {
        return {
          content: [{ type: 'text' as const, text: 'No TODOs found in database.' }],
        };
      }

      const formatted = getFormatter().formatTodos(todos);

      return {
        content: [
          {
            type: 'text' as const,
            text: `Showing ${count} of ${total} TODO(s):\n\n${formatted}`,
          },
        ],
      };
    },
  );
}
