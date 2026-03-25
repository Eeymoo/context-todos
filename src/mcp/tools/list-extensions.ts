import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listExtensionsOperation } from '../operations/index.js';


export function registerListExtensions(server: McpServer) {
  server.registerTool(
    'list-supported-extensions',
    {
      title: 'List Supported Extensions',
      description: 'Lists all supported file extensions.',
    },
    async () => {
      const result = await listExtensionsOperation();

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

      const { extensions, count } = result.data;

      return {
        content: [
          {
            type: 'text' as const,
            text: `Supported extensions (${count}):\n${extensions.join(', ')}`,
          },
        ],
      };
    },
  );
}
