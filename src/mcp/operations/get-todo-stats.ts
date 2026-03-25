/**
 * Get todo stats operation.
 *
 * This module provides the core logic for retrieving aggregated statistics
 * of persisted TODOs. Used by both CLI commands and MCP tools to eliminate
 * code duplication.
 */

import { getTodoStats } from '../db.js';
import type { GetTodoStatsResult, OperationResult } from './types.js';

/**
 * Get aggregated statistics of all persisted TODOs.
 *
 * This function handles the core logic of:
 * 1. Calling the database stats function
 * 2. Returning a standardized operation result
 *
 * @returns OperationResult<GetTodoStatsResult> with stats or error message
 *
 * @example
 * const result = await getTodoStatsOperation();
 *
 * if (result.success) {
 *   console.log(`Total TODOs: ${result.data.total}`);
 *   console.log(`By tag:`, result.data.byTag);
 * }
 */
export async function getTodoStatsOperation(): Promise<OperationResult<GetTodoStatsResult>> {
  try {
    const stats = await getTodoStats();

    return {
      success: true,
      data: {
        total: stats.total,
        byTag: stats.byTag,
        byFile: stats.byFile,
        byCategory: stats.byCategory,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Error getting todo stats: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
