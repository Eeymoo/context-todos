#!/usr/bin/env node
import { Command } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createServer } from './mcp/index.js';
import { createServer as createNodeHttpServer } from 'node:http';
import type { ServerMode } from './mcp/types.js';
import { consola } from 'consola';
import { scanFileOperation, scanDirectoryOperation, listExtensionsOperation, listTodosOperation, getTodoStatsOperation, watchStartOperation, EXTENSION_CANDIDATES, type OperationConfig, type ListTodosInput } from './mcp/operations/index.js';
import type { ScanDirectoryInput } from './mcp/operations/index.js';
import type { TodoItem } from './mcp/types.js';
import { initDb } from './mcp/db.js';
import { getFormatter, setFormatter, type OutputFormat } from './mcp/formatter.js';

const program = new Command();

const logger = consola;

program
  .name('context-todos')
  .description('AI context-aware TODO tracker')
  .version('0.1.0')
  .option('--labs', 'Enable Labs mode (experimental features)')
  .option('--max', 'Enable Max mode (watcher + database persistence)')
  .option('--block-comment', 'Enable multiline TODO parsing (requires --labs)')
  .option('--use-gitignore', 'Use .gitignore to filter files', true)
  .option('--gitignore-path <path>', 'Custom path to gitignore file (default: .gitignore)')
  .option('--filter <patterns>', 'Comma-separated patterns to exclude (e.g., "*.test.ts,*.spec.ts,__tests__/**")')
  .option('--format <format>', 'Output format: toon (default), json, pretty', 'toon')
  .option('--log', 'Enable log output')
  .option('--log-filter <pattern>', 'Filter logs by pattern');

program
  .command('mcp')
  .description('Start MCP server')
  .option('-p, --port <number>', 'Port to run the MCP server on (enables SSE mode)')
  .option('-w, --watch <path>', 'Path to watch for changes', '.')
  .option('--stdio', 'Force stdio mode instead of SSE')
  .action(async (options) => {
    // Get global options
    const globalOpts = program.opts();

    // block-comment requires --labs mode
    if (globalOpts.blockComment && !globalOpts.labs) {
      logger.warn('--block-comment requires --labs mode, ignoring --block-comment');
      globalOpts.blockComment = false;
    }

    let mode: ServerMode;
    if (globalOpts.labs && globalOpts.max) {
      mode = 'labs-max';
    } else if (globalOpts.labs) {
      mode = 'labs-standard';
    } else if (globalOpts.max) {
      mode = 'max';
    } else {
      mode = 'standard';
    }

    const useSSE = options.port !== undefined && !options.stdio;

    const serverOptions = {
      mode,
      watchPath: options.watch as string,
      useGitignore: globalOpts.useGitignore as boolean,
      ...(globalOpts.gitignorePath && { gitignorePath: globalOpts.gitignorePath as string }),
      ...(globalOpts.filter && { filter: globalOpts.filter as string }),
      format: globalOpts.format as string,
      ...(globalOpts.log && { log: globalOpts.log as boolean }),
      ...(globalOpts.logFilter && { logFilter: globalOpts.logFilter as string }),
      ...(globalOpts.blockComment && { blockComment: globalOpts.blockComment as boolean }),
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
  .action(async (file, options) => {
    // Get global options
    const globalOpts = program.opts();

    // block-comment requires --labs mode
    if (globalOpts.blockComment && !globalOpts.labs) {
      logger.warn('--block-comment requires --labs mode, ignoring --block-comment');
      globalOpts.blockComment = false;
    }

    if (globalOpts.log) {
      logger.info(`Scanning file: ${file}`);
    }

    try {
      const config: OperationConfig = {};
      if (globalOpts.blockComment) {
        config.blockComment = globalOpts.blockComment;
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

      if (globalOpts.log) {
        logger.info(`Found ${todos.length} TODO(s) in ${file}`);
      }

      if (todos.length === 0) {
        console.log(`No TODOs found in ${file}`);
        process.exit(0);
      }

      setFormatter(globalOpts.format as OutputFormat);
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
  .action(async () => {
    try {
      const result = await listExtensionsOperation();

      if (!result.success) {
        console.log(result.error);
        process.exit(1);
      }

      const { extensions, count } = result.data;

      // Get global options
      const globalOpts = program.opts();

      if (globalOpts.format === 'json') {
        console.log(JSON.stringify(extensions, null, 2));
      } else {
        console.log(`Supported extensions (${count}):\n${extensions.join(', ')}`);
      }
    } catch (error) {
      console.log(`Error listing extensions: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Check if --labs is in command line arguments
const hasLabs = process.argv.includes('--labs');
const hasMax = process.argv.includes('--max');

// Add scan-directory command only if --labs is enabled
if (hasLabs) {
  program
    .command('scan-directory <directory>')
    .description('Scan a directory recursively for TODO comments')
    .option('--extensions <list>', 'Comma-separated list of file extensions to include (e.g., ".ts,.js")')
    .action(async (directory, options) => {
    // Get global options
    const globalOpts = program.opts();

    // block-comment requires --labs mode
    if (globalOpts.blockComment && !globalOpts.labs) {
      logger.warn('--block-comment requires --labs mode, ignoring --block-comment');
      globalOpts.blockComment = false;
    }

    if (globalOpts.log) {
      logger.info(`Scanning directory: ${directory}`);
    }

    try {
      const config: OperationConfig = {};
      if (globalOpts.blockComment) {
        config.blockComment = globalOpts.blockComment;
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

      if (globalOpts.log) {
        logger.info(`Found ${todos.length} TODO(s) in ${directory}`);
      }

      if (todos.length === 0) {
        console.log(`No TODOs found in ${directory}`);
        process.exit(0);
      }

      setFormatter(globalOpts.format as OutputFormat);
      const formatter = getFormatter();
      const formatted = formatter.formatTodos(todos);
      console.log(`Found ${todos.length} TODO(s) across ${fileCount} file(s) in ${directory}:\n\n${formatted}`);
    } catch (error) {
      console.log(`Error scanning directory: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
}

// Add list-todos command only if --max is enabled (requires database)
if (hasMax) {
  program
    .command('list-todos')
    .description('List persisted TODOs from database')
    .option('--tag <tag>', 'Filter by tag (TODO, FIXME, HACK, XXX)')
    .option('--file <pattern>', 'Filter by file path (partial match)')
    .option('--category <category>', 'Filter by category')
    .option('--limit <number>', 'Maximum number of results', '100')
    .option('--offset <number>', 'Offset for pagination', '0')
    .action(async (options) => {
      // Get global options
      const globalOpts = program.opts();

      if (globalOpts.log) {
        logger.info('Listing todos from database');
      }

      try {
        // Initialize database
        await initDb('.');

        const input: ListTodosInput = {
          config: {},
        };

        if (options.tag) {
          input.tag = options.tag;
        }
        if (options.file) {
          input.file = options.file;
        }
        if (options.category) {
          input.category = options.category;
        }
        if (options.limit) {
          input.limit = parseInt(options.limit, 10);
        }
        if (options.offset) {
          input.offset = parseInt(options.offset, 10);
        }

        const result = await listTodosOperation(input);

        if (!result.success) {
          console.log(result.error);
          process.exit(1);
        }

        const { todos, total, count } = result.data;

        if (globalOpts.log) {
          logger.info(`Found ${count} TODO(s) (total: ${total})`);
        }

        if (todos.length === 0) {
          console.log('No TODOs found in database');
          process.exit(0);
        }

        setFormatter(globalOpts.format as OutputFormat);
        const formatter = getFormatter();
        const formatted = formatter.formatTodos(todos);
        console.log(`Found ${count} TODO(s) (total: ${total}):\n\n${formatted}`);
      } catch (error) {
        console.log(`Error listing todos: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
// Add get-todo-stats command only if --labs and --max are both enabled (requires labs-max mode)
if (hasLabs && hasMax) {
  program
    .command('get-todo-stats')
    .description('Get aggregated TODO statistics from database')
    .action(async () => {
      // Get global options
      const globalOpts = program.opts();

      if (globalOpts.log) {
        logger.info('Getting TODO statistics from database');
      }

      try {
        // Initialize database
        await initDb('.');

        const result = await getTodoStatsOperation();

        if (!result.success) {
          console.log(result.error);
          process.exit(1);
        }

        const stats = result.data;

        if (globalOpts.log) {
          logger.info(`Found ${stats.total} TODO(s) in database`);
        }

        if (stats.total === 0) {
          console.log('No TODOs found in database');
          process.exit(0);
        }

        setFormatter(globalOpts.format as OutputFormat);
        const formatter = getFormatter();

        const formattedStats = {
          total: stats.total,
          byTag: Object.fromEntries(stats.byTag.map(t => [t.tag, t.count])),
          byCategory: Object.fromEntries(stats.byCategory.map(c => [c.category ?? '(none)', c.count])),
          topFiles: stats.byFile.map(f => ({ file: f.file, count: f.count })),
        };

        const formatted = formatter.formatStats(formattedStats);
        console.log(`TODO Statistics:\n\n${formatted}`);
      } catch (error) {
        console.log(`Error getting TODO stats: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
});
}

// Add watch-start command only if --max is enabled (requires max mode)
if (hasMax) {
  program
    .command('watch-start [path]')
    .description('Start watching a directory for TODO changes (press Ctrl+C to stop)')
    .option('--extensions <list>', 'Comma-separated list of file extensions to include')
    .action(async (path, options) => {
      // Get global options
      const globalOpts = program.opts();

      if (globalOpts.log) {
        logger.info(`Starting watcher for path: ${path ?? '.'}`);
      }

      try {
        // Initialize database
        await initDb('.');

        const input: Parameters<typeof watchStartOperation>[0] = {
          path: path ?? '.',
          ...(options.extensions && {
            extensions: options.extensions.split(',').map((ext: string) => ext.trim())
          }),
          // For simplicity, we don't pass gitignoreFilter and scanOptions in CLI mode
          // These would require more complex configuration from command line
        };

        const result = await watchStartOperation(input);

        if (!result.success) {
          console.log(result.error);
          process.exit(1);
        }

        const { watching, path: watchedPath } = result.data;

        if (!watching) {
          console.log('Failed to start watcher');
          process.exit(1);
        }

        console.log(`Started watching: ${watchedPath}`);
        console.log('Press Ctrl+C to stop watching...');

        // Keep the process running until SIGINT
        // This is a simple implementation - in a real application,
        // we might want to handle signals more gracefully
        await new Promise<void>((resolve) => {
          process.on('SIGINT', () => {
            console.log('\nStopping watcher...');
            resolve();
          });
        });

        process.exit(0);
      } catch (error) {
        console.log(`Error starting watcher: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}

program.parse();
