#!/usr/bin/env node
import { Command } from 'commander';
import { consola } from 'consola';

const program = new Command();

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
  .action((options) => {
    const useSSE = options.port !== undefined && !options.stdio;
    const mode = useSSE ? 'SSE' : 'stdio';
    
    consola.info(`Starting MCP server in ${mode} mode...`);
    
    if (useSSE) {
      consola.info(`SSE server will run on port ${options.port}`);
      // TODO: 启动 SSE 模式的 MCP 逻辑
    } else {
      // TODO: 启动 stdio 模式的 MCP 逻辑
    }
  });

program.parse();