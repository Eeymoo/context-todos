import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isExtensionSupported } from '../scanner.js';

const EXTENSION_CANDIDATES = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
  '.cs', '.php', '.swift', '.kt', '.scala', '.sh', '.bash',
  '.css', '.scss', '.less', '.html', '.vue', '.svelte',
  '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.sql', '.lua', '.r', '.m', '.mm', '.pl', '.pm',
  '.ex', '.exs', '.erl', '.hs', '.elm', '.clj', '.cljs',
  '.tf', '.hcl', '.dockerfile',
];

export function registerListExtensions(server: McpServer) {
  server.registerTool(
    'list-supported-extensions',
    {
      title: 'List Supported Extensions',
      description: 'Lists all supported file extensions.',
    },
    async () => {
      const supported = EXTENSION_CANDIDATES.filter((ext) => isExtensionSupported(ext));
      return {
        content: [
          {
            type: 'text' as const,
            text: `Supported extensions (${supported.length}):\n${supported.join(', ')}`,
          },
        ],
      };
    },
  );
}
