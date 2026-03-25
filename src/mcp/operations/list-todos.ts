/**
 * List todos operation.
 *
 * This module provides the core logic for querying persisted TODOs from
 * the database. Used by both CLI commands and MCP tools to eliminate
 * code duplication.
 */

import { queryTodos } from '../db.js';
import type { ListTodosInput, ListTodosResult, OperationResult } from './types.js';

/**
 * Query persisted TODOs from the database with optional filters.
 *
 * This function handles the core logic of:
 * 1. Building the query from input parameters
 * 2. Calling the database query function
 * 3. Returning a standardized operation result
 *
 * @param input - List todos input parameters including filters and pagination
 * @returns OperationResult<ListTodosResult> with todos, total count, or error message
 *
 * @example
 * const result = await listTodosOperation({
 *   tag: 'TODO',
 *   limit: 10,
 *   config: {},
 * });
 *
 * if (result.success) {
 *   console.log(`Found ${result.data.total} TODOs`);
 * }
 */
export async function listTodosOperation(
  input: ListTodosInput
): Promise<OperationResult<ListTodosResult>> {
  try {
    const { tag, file, category, limit, offset } = input;

    const query: Parameters<typeof queryTodos>[0] = {};
    if (tag !== undefined) query.tag = tag;
    if (file !== undefined) query.file = file;
    if (category !== undefined) query.category = category;
    if (limit !== undefined) query.limit = limit;
    if (offset !== undefined) query.offset = offset;

    const { todos, total } = await queryTodos(query);

    return {
      success: true,
      data: {
        todos,
        total,
        count: todos.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Error listing todos: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
