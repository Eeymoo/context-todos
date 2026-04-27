#!/usr/bin/env node
import { Command } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from './mcp/index.js';
import { createServer as createNodeHttpServer } from 'node:http';
import type { ServerMode } from './mcp/types.js';
import { consola } from 'consola';
import { scanFileOperation, scanDirectoryOperation, listExtensionsOperation, EXTENSION_CANDIDATES, type OperationConfig } from './mcp/operations/index.js';
import type { ScanDirectoryInput } from './mcp/operations/index.js';
import type { TodoItem } from './mcp/types.js';
import { getFormatter, setFormatter, type OutputFormat } from './mcp/formatter.js';

const program = new Command();

const logger = consola;

program
  .name('context-todos')
  .description('AI context-aware TODO tracker')
  .version('0.2.0-alpha.2');

program
  .command('mcp')
  .description('Start MCP server')
  .option('-p, --port <number>', 'Port to run the MCP server on (enables SSE mode)')
  .option('-w, --watch <path>', 'Path to watch for changes', '.')
  .option('--stdio', 'Force stdio mode instead of SSE')
  .option('--max', 'Enable Max mode (watcher + database persistence)')
  .option('--labs', 'Enable Labs mode (experimental features)')
  .option('--block-comment', 'Enable multiline TODO parsing (requires --labs)')
  .option('--use-gitignore', 'Use .gitignore to filter files', true)
  .option('--gitignore-path <path>', 'Custom path to gitignore file (default: .gitignore)')
  .option('--filter <patterns>', 'Comma-separated patterns to exclude (e.g., "*.test.ts,*.spec.ts,__tests__/**")')
  .option('--format <format>', 'Output format: toon (default), json, pretty', 'toon')
  .option('--log', 'Enable log output')
  .option('--log-filter <pattern>', 'Filter logs by pattern')
  .action(async (options) => {
    // block-comment requires --labs mode
    if (options.blockComment && !options.labs) {
      logger.warn('--block-comment requires --labs mode, ignoring --block-comment');
      options.blockComment = false;
    }

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
      ...(options.filter && { filter: options.filter as string }),
      format: options.format as string,
      ...(options.log && { log: options.log as boolean }),
      ...(options.logFilter && { logFilter: options.logFilter as string }),
      ...(options.blockComment && { blockComment: options.blockComment as boolean }),
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

program
  .command('scan-file <file>')
  .description('Scan a single file for TODO comments')
  .option('--labs', 'Enable experimental features')
  .option('--block-comment', 'Enable multiline TODO parsing (requires --labs)')
  .option('--format <format>', 'Output format: toon (default), json, pretty', 'toon')
  .option('--log', 'Enable log output')
  .option('--log-filter <pattern>', 'Filter logs by pattern')
  .action(async (file, options) => {
    // block-comment requires --labs mode
    if (options.blockComment && !options.labs) {
      logger.warn('--block-comment requires --labs mode, ignoring --block-comment');
      options.blockComment = false;
    }

    if (options.log) {
      logger.info(`Scanning file: ${file}`);
    }

    try {
      const config: OperationConfig = {};
      if (options.blockComment) {
        config.blockComment = options.blockComment;
      }

      const result = await scanFileOperation({
        filePath: file,
        config,
      });

      if (!result.success) {
        console.log(result.error);
        process.exit(1);
      }

      const { todos, filePath: resolvedPath } = result.data;

      if (options.log) {
        logger.info(`Found ${todos.length} TODO(s) in ${file}`);
      }

      if (todos.length === 0) {
        console.log(`No TODOs found in ${file}`);
        process.exit(0);
      }

      setFormatter(options.format as OutputFormat);
      const formatter = getFormatter();
      const formatted = formatter.formatTodos(todos);
      console.log(`Found ${todos.length} TODO(s) in ${file}:\n\n${formatted}`);
    } catch (error) {
      console.log(`Error scanning file: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });


program
  .command('list-extensions')
  .description('List supported file extensions')
  .option('--format <format>', 'Output format: toon (default), json, pretty', 'toon')
  .action(async (options) => {
    try {
      const result = await listExtensionsOperation();

      if (!result.success) {
        console.log(result.error);
        process.exit(1);
      }

      const { extensions, count } = result.data;

      if (options.format === 'json') {
        console.log(JSON.stringify(extensions, null, 2));
      } else {
        console.log(`Supported extensions (${count}):\n${extensions.join(', ')}`);
      }
    } catch (error) {
      console.log(`Error listing extensions: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command('scan-directory <directory>')
  .description('Scan a directory recursively for TODO comments')
  .option('--block-comment', 'Enable multiline TODO parsing')
  .option('--labs', 'Enable experimental features')
  .option('--format <format>', 'Output format: toon (default), json, pretty', 'toon')
  .option('--log', 'Enable log output')
  .option('--log-filter <pattern>', 'Filter logs by pattern')
  .option('--extensions <list>', 'Comma-separated list of file extensions to include (e.g., ".ts,.js")')
  .action(async (directory, options) => {
    if (options.blockComment && !options.labs) {
      logger.warn('--block-comment requires --labs mode, ignoring --block-comment');
      options.blockComment = false;
    }

    if (options.log) {
      logger.info(`Scanning directory: ${directory}`);
    }

    try {
      const config: OperationConfig = {};
      if (options.blockComment) {
        config.blockComment = options.blockComment;
      }

      const input: ScanDirectoryInput = {
        directoryPath: directory,
        config,
      };

      if (options.extensions) {
        input.extensions = options.extensions.split(',').map((ext: string) => ext.trim());
      }

      const result = await scanDirectoryOperation(input);

      if (!result.success) {
        console.log(result.error);
        process.exit(1);
      }

      const { todos, directoryPath, fileCount } = result.data;

      if (options.log) {
        logger.info(`Found ${todos.length} TODO(s) in ${directory}`);
      }

      if (todos.length === 0) {
        console.log(`No TODOs found in ${directory}`);
        process.exit(0);
      }

      setFormatter(options.format as OutputFormat);
      const formatter = getFormatter();
      const formatted = formatter.formatTodos(todos);
      console.log(`Found ${todos.length} TODO(s) across ${fileCount} file(s) in ${directory}:\n\n${formatted}`);
    } catch (error) {
      console.log(`Error scanning directory: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program.parse();
