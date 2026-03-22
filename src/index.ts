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
  .option('--max', 'Enable full-featured mode (watcher + database persistence)')
  .option('--labs', 'Enable labs mode (includes experimental features)')
  .action(async (options) => {
    let mode: ServerMode = 'standard';
    if (options.labs) {
      mode = 'labs';
    } else if (options.max) {
      mode = 'max';
    }

    const useSSE = options.port !== undefined && !options.stdio;

    const { server, totalTodos } = await createServer({
      mode,
      watchPath: options.watch as string,
    });

    if (mode !== 'standard') {
      const modeMsg = mode === 'labs' ? 'Starting in labs mode (all features)' : 'Starting in max mode (watcher + database)';
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
