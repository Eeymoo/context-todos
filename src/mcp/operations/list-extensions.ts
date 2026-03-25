/**
 * List extensions operation.
 *
 * This module provides the core logic for listing supported file extensions.
 * Used by both CLI commands and MCP tools to eliminate code duplication.
 */

import type { ListExtensionsResult, OperationResult } from './types.js';
import { getSupportedExtensions } from './extensions.js';

/**
 * List supported file extensions.
 *
 * This function returns a filtered list of supported file extensions
 * based on the leasot library's capabilities.
 *
 * @returns OperationResult<ListExtensionsResult> with extensions array and count
 */
export async function listExtensionsOperation(): Promise<OperationResult<ListExtensionsResult>> {
  try {
    const extensions = getSupportedExtensions();
    const count = extensions.length;

    return {
      success: true,
      data: {
        extensions,
        count,
      },
    };
  } catch (err) {
    // Catch any unexpected errors
    return {
      success: false,
      error: `Error listing extensions: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}