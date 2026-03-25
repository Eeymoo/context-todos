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
 * 2. Using provided watcher or creating a new one
 * 3. Starting the watcher
 * 4. Returning a standardized operation result
 *
 * @param input - Watch start input parameters including path, extensions, and optional watcher
 * @returns OperationResult<WatchStartResult> with watch status, path, and watcher instance
 *
 * @example
 * // CLI usage (creates new watcher)
 * const result = await watchStartOperation({
 *   path: './src',
 *   extensions: ['.ts', '.js'],
 * });
 *
 * if (result.success) {
 *   console.log(`Watching: ${result.data.path}`);
 * }
 *
 * @example
 * // MCP usage (with existing watcher)
 * const watcher = createWatcher({ gitignoreFilter });
 * const result = await watchStartOperation({
 *   path: './src',
 *   extensions: ['.ts', '.js'],
 *   gitignoreFilter,
 *   watcher,
 * });
 *
 * if (result.success) {
 *   // MCP tool can use result.data.watcher for subsequent calls
 *   console.log(`Watching: ${result.data.path}`);
 * }
 */
export async function watchStartOperation(
  input: WatchStartInput
): Promise<OperationResult<WatchStartResult>> {
  try {
    const { path, extensions, gitignoreFilter, scanOptions, watcher: providedWatcher } = input;
    const watchPath = path ?? '.';

    // Use provided watcher or create a new one
    const watcher = providedWatcher ?? createWatcher(
      gitignoreFilter
        ? { gitignoreFilter, ...(scanOptions && { scanOptions }) }
        : scanOptions
          ? { scanOptions }
          : undefined
    );

    await watcher.start(watchPath, extensions);

    return {
      success: true,
      data: {
        watching: true,
        path: resolve(watchPath),
        watcher,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Error starting watcher: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
