import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { resolve, extname } from 'node:path';
import { isExtensionSupported, scanFile } from '../scanner.js';

export function registerScanFile(server: McpServer) {
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
        const absPath = resolve(filePath);
        const ext = extname(absPath);

        if (!ext || !isExtensionSupported(ext)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Unsupported file extension: ${ext || '(none)'}`,
              },
            ],
          };
        }

        const todos = await scanFile(absPath);

        if (todos.length === 0) {
          return {
            content: [
              { type: 'text' as const, text: `No TODOs found in ${filePath}` },
            ],
          };
        }

        const formatted = todos
          .map((todo) => {
            let line = '[' + todo.tag + '] ' + todo.file + ':' + todo.line + ' - ' + todo.text;
            if (todo.ref) {
              line = line + ' (ref: ' + todo.ref + ')';
            }
            return line;
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${todos.length} TODO(s) in ${filePath}:\n\n${formatted}`,
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
