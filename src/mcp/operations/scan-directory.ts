/**
 * Scan directory operation.
 *
 * This module provides the core logic for scanning a directory recursively
 * for TODO comments. Used by both CLI commands and MCP tools to eliminate
 * code duplication.
 */

import { resolve, relative } from 'node:path';
import { statSync } from 'node:fs';
import { collectFiles, scanFile, type ScanFileOptions } from '../scanner.js';
import type { TodoItem } from '../types.js';
import type { ScanDirectoryInput, ScanDirectoryResult, OperationResult } from './types.js';

/**
 * Scan a directory recursively for TODO comments.
 *
 * This function handles the core logic of:
 * 1. Resolving the directory path
 * 2. Validating that it's a directory
 * 3. Collecting all supported files
 * 4. Scanning each file for TODO comments
 * 5. Accumulating results with relative paths
 * 6. Returning a standardized operation result
 *
 * @param input - Scan directory input parameters
 * @returns OperationResult<ScanDirectoryResult> with todos, file count, or error message
 */
export async function scanDirectoryOperation(
  input: ScanDirectoryInput
): Promise<OperationResult<ScanDirectoryResult>> {
  try {
    const { directoryPath, extensions, config } = input;
    const absDir = resolve(directoryPath);

    // Validate directory
    const stat = statSync(absDir);
    if (!stat.isDirectory()) {
      return {
        success: false,
        error: `Not a directory: ${absDir}`,
      };
    }

    // Collect files
    const files = await collectFiles(absDir, extensions);

    // Scan files and accumulate results
    const allTodos: TodoItem[] = [];
    for (const file of files) {
      const scanOptions: ScanFileOptions = {};
      if (config.blockComment !== undefined) {
        scanOptions.blockComment = config.blockComment;
      }

      const todos = await scanFile(file, scanOptions);
      for (const todo of todos) {
        allTodos.push({
          ...todo,
          file: relative(absDir, file),
        });
      }
    }

    // Return result
    return {
      success: true,
      data: {
        todos: allTodos,
        directoryPath: absDir,
        fileCount: files.length,
      },
    };
  } catch (err) {
    // Catch any unexpected errors
    return {
      success: false,
      error: `Error scanning directory: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
