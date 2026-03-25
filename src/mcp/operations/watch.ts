/**
 * Watch operation.
 *
 * This module provides the core logic for starting file watching.
 * Used by both CLI commands and MCP tools to eliminate code duplication.
 */

import { resolve } from 'node:path';
import { createWatcher } from '../watcher.js';
import type { WatchStartInput, WatchStartResult, OperationResult } from './types.js';

/**
 * Start watching a directory for file changes.
 *
 * This function handles the core logic of:
 * 1. Resolving the watch path
 * 2. Creating and starting the watcher
 * 3. Returning a standardized operation result
 *
 * @param input - Watch start input parameters including path and extensions
 * @returns OperationResult<WatchStartResult> with watch status or error message
 *
 * @example
 * const result = await watchStartOperation({
 *   path: './src',
 *   extensions: ['.ts', '.js'],
 * });
 *
 * if (result.success) {
 *   console.log(`Watching: ${result.data.path}`);
 * }
 */
export async function watchStartOperation(
  input: WatchStartInput
): Promise<OperationResult<WatchStartResult>> {
  try {
    const { path, extensions, gitignoreFilter, scanOptions } = input;
    const watchPath = path ?? '.';

    const watcherOptions = gitignoreFilter
      ? { gitignoreFilter, ...(scanOptions && { scanOptions }) }
      : scanOptions
        ? { scanOptions }
        : undefined;

    const watcher = createWatcher(watcherOptions);
    await watcher.start(watchPath, extensions);

    return {
      success: true,
      data: {
        watching: true,
        path: resolve(watchPath),
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Error starting watcher: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
