import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { scanDirectoryOperation, type OperationConfig, type ScanDirectoryInput } from '../operations/index.js';
import { getFormatter } from '../formatter.js';
import type { ScanFileOptions } from '../scanner.js';

export function registerScanDirectory(server: McpServer, scanOptions?: ScanFileOptions) {
  server.registerTool(
    'scan-directory',
    {
      title: 'Scan Directory for TODOs',
      description:
        'Recursively scans a directory for TODO/FIXME/HACK/XXX comments across all supported files.',
      inputSchema: z.object({
        path: z
          .string()
          .describe('Directory path (default: current directory)')
          .optional(),
        extensions: z
          .array(z.string())
          .describe('Filter by file extensions, e.g. [\".ts\", \".js\"]. If omitted, scans all supported extensions.')
          .optional(),
      }),
    },
    async ({ path: dirPath, extensions }) => {
      try {
        // Convert scanOptions to OperationConfig
        const config: OperationConfig = {};
        if (scanOptions?.blockComment !== undefined) {
          config.blockComment = scanOptions.blockComment;
        }

        // Call shared operation
        const input: any = {
          directoryPath: dirPath ?? '.',
          config,
        };
        if (extensions !== undefined) {
          input.extensions = extensions;
        }
        const result = await scanDirectoryOperation(input);

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

        const { todos, directoryPath, fileCount } = result.data;

        if (todos.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `No TODOs found in ${directoryPath}`,
              },
            ],
          };
        }

        const formatted = getFormatter().formatTodos(todos);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${todos.length} TODO(s) across ${fileCount} file(s) in ${directoryPath}:\n\n${formatted}`,
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error scanning directory: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );
}