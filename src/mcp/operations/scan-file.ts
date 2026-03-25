/**
 * Scan file operation.
 *
 * This module provides the core logic for scanning a single file for TODO comments.
 * Used by both CLI commands and MCP tools to eliminate code duplication.
 */

import { resolve, extname } from 'node:path';
import { scanFile as scanFileCore, isExtensionSupported, type ScanFileOptions } from '../scanner.js';
import type { ScanFileInput, ScanFileResult, OperationResult } from './types.js';

/**
 * Scan a single file for TODO comments.
 *
 * This function handles the core logic of:
 * 1. Resolving the file path
 * 2. Validating the file extension
 * 3. Scanning for TODO comments
 * 4. Returning a standardized operation result
 *
 * @param input - Scan file input parameters
 * @returns OperationResult<ScanFileResult> with todos or error message
 */
export async function scanFileOperation(
  input: ScanFileInput
): Promise<OperationResult<ScanFileResult>> {
  try {
    const { filePath, config } = input;
    const absPath = resolve(filePath);
    const ext = extname(absPath);

    // Validate file extension
    if (!ext) {
      return {
        success: false,
        error: `Unsupported file extension: (none)`,
      };
    }

    // Check if extension is supported
    if (!isExtensionSupported(ext)) {
      return {
        success: false,
        error: `Unsupported file extension: ${ext}`,
      };
    }

    // Prepare scan options
    const scanOptions: ScanFileOptions = {};
    if (config.blockComment !== undefined) {
      scanOptions.blockComment = config.blockComment;
    }

    // Scan file
    const todos = await scanFileCore(absPath, scanOptions);

    // Return result
    return {
      success: true,
      data: {
        todos,
        filePath: absPath,
      },
    };
  } catch (err) {
    // Catch any unexpected errors
    return {
      success: false,
      error: `Error scanning file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// Re-export types for convenience
