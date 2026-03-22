#!/usr/bin/env node
import { Command } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from './mcp/index.js';
import { createServer as createNodeHttpServer } from 'node:http';
import type { ServerMode } from './mcp/types.js';
import { consola } from 'consola';

const program = new Command();

const logger = consola;

program
  .name('context-todos')
  .description('AI context-aware TODO tracker')
  .version('1.0.0');

program
  .command('mcp')
  .description('Start MCP server')
  .option('-p, --port <number>', 'Port to run the MCP server on (enables SSE mode)')
  .option('-w, --watch <path>', 'Path to watch for changes', '.')
  .option('--stdio', 'Force stdio mode instead of SSE')
  .option('--max', 'Enable Max mode (watcher + database persistence)')
  .option('--labs', 'Enable Labs mode (experimental features)')
  .option('--use-gitignore', 'Use .gitignore to filter files', false)
  .option('--gitignore-path <path>', 'Custom path to gitignore file (default: .gitignore)')
  .action(async (options) => {
    let mode: ServerMode;
    if (options.labs && options.max) {
      mode = 'labs-max';
    } else if (options.labs) {
      mode = 'labs-standard';
    } else if (options.max) {
      mode = 'max';
    } else {
      mode = 'standard';
    }

    const useSSE = options.port !== undefined && !options.stdio;

    const serverOptions = {
      mode,
      watchPath: options.watch as string,
      useGitignore: options.useGitignore as boolean,
      ...(options.gitignorePath && { gitignorePath: options.gitignorePath as string }),
    };

    const { server, totalTodos } = await createServer(serverOptions);

    if (mode !== 'standard' && mode !== 'labs-standard') {
      const modeMsg = mode === 'labs-max'
        ? 'Starting in labs-max mode (all features + experimental)'
        : 'Starting in max mode (watcher + database)';
      logger.info(modeMsg);
      logger.info(`Initial scan complete: ${totalTodos} TODO(s) persisted`);
    }

    if (useSSE) {
      const port = Number(options.port);
      let sseTransport: SSEServerTransport | undefined;

      const httpServer = createNodeHttpServer(async (req, res) => {
        if (req.method === 'GET' && req.url === '/sse') {
          sseTransport = new SSEServerTransport('/messages', res);
          await server.connect(sseTransport);
          return;
        }

        if (req.method === 'POST' && req.url === '/messages') {
          if (!sseTransport) {
            res.writeHead(400);
            res.end('No SSE connection established');
            return;
          }

          const body: Buffer[] = [];
          req.on('data', (chunk: Buffer) => body.push(chunk));
          req.on('end', async () => {
            await sseTransport!.handlePostMessage(req, res, Buffer.concat(body).toString());
          });
          return;
        }

        res.writeHead(404);
        res.end('Not found');
      });

      httpServer.listen(port, () => {
        logger.success(`SSE server running on http://localhost:${port}/sse`);
      });
    } else {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    }
  });

program.parse();
