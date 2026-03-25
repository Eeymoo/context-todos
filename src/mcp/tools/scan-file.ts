import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { scanFileOperation, type OperationConfig } from '../operations/index.js';
import { getFormatter } from '../formatter.js';
import type { ScanFileOptions } from '../scanner.js';

export function registerScanFile(server: McpServer, scanOptions?: ScanFileOptions) {
  server.registerTool(
    'scan-file',
    {
      title: 'Scan File for TODOs',
      description:
        'Parse a single file and return all TODO/FIXME/HACK/XXX comments found in it.',
      inputSchema: z.object({
        path: z.string().describe('File path (absolute or relative)'),
      }),
    },
    async ({ path: filePath }) => {
      try {
        // Convert scanOptions to OperationConfig
        const config: OperationConfig = {};
        if (scanOptions?.blockComment !== undefined) {
          config.blockComment = scanOptions.blockComment;
        }

        // Call shared operation
        const result = await scanFileOperation({
          filePath,
          config,
        });

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

        const { todos, filePath: resolvedPath } = result.data;

        if (todos.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No TODOs found in ${resolvedPath}`,
              },
            ],
          };
        }

        const formatted = getFormatter().formatTodos(todos);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${todos.length} TODO(s) in ${resolvedPath}:\n\n${formatted}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error scanning file: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );
}
