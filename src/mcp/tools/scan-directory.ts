import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { resolve, relative } from 'node:path';
import { statSync } from 'node:fs';
import { collectFiles, scanFile } from '../scanner.js';
import type { TodoItem } from '../types.js';
import type { Formatter } from '../formatter.js';

export function registerScanDirectory(server: McpServer, formatter: Formatter) {
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
          .describe('Filter by file extensions, e.g. [".ts", ".js"]. If omitted, scans all supported extensions.')
          .optional(),
      }),
    },
    async ({ path: dirPath, extensions }) => {
      try {
        const absDir = resolve(dirPath ?? '.');
        const stat = statSync(absDir);

        if (!stat.isDirectory()) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Not a directory: ${absDir}`,
              },
            ],
          };
        }

        const files = await collectFiles(absDir, extensions);
        const allTodos: TodoItem[] = [];

        for (const file of files) {
          const todos = await scanFile(file);
          for (const todo of todos) {
            allTodos.push({ ...todo, file: relative(absDir, file) });
          }
        }

        if (allTodos.length === 0) {
          return {
            content: [
              { type: 'text' as const, text: `No TODOs found in ${absDir}` },
            ],
          };
        }

        const formatted = formatter.formatTodos(allTodos);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Found ${allTodos.length} TODO(s) across ${files.length} file(s) in ${absDir}:\n\n${formatted}`,
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
