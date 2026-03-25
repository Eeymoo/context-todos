/**
 * Shared types for operations module.
 *
 * This module defines common types used by all operations to ensure
 * consistent error handling and configuration across CLI and MCP tools.
 */

import type { TodoItem } from '../types.js';
import type { OutputFormat } from '../formatter.js';
import type { GitignoreFilter } from '../gitignore.js';
import type { ScanFileOptions } from '../scanner.js';

/**
 * Generic operation result type that represents either a successful result
 * with data or a failure with an error message.
 *
 * @template T The type of data returned on success
 */
export type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Common configuration options for operations.
 * Shared between CLI commands and MCP tools.
 */
export interface OperationConfig {
  /** Enable multiline TODO parsing */
  blockComment?: boolean;
  /** Output format for formatted results */
  format?: OutputFormat;
}

/**
 * Result data for scan file operation.
 */
export interface ScanFileResult {
  /** Array of TODO items found in the file */
  todos: TodoItem[];
  /** The file path that was scanned */
  filePath: string;
}

/**
 * Input parameters for scan-file operation.
 */
export interface ScanFileInput {
  /** File path to scan (absolute or relative) */
  filePath: string;
  /** Configuration options */
  config: OperationConfig;
}

/**
 * Result data for scan directory operation.
 */
export interface ScanDirectoryResult {
  /** Array of TODO items found in the directory */
  todos: TodoItem[];
  /** The directory path that was scanned */
  directoryPath: string;
  /** Number of files that were scanned */
  fileCount: number;
}

/**
 * Input parameters for scan-directory operation.
 */
export interface ScanDirectoryInput {
  /** Directory path to scan (absolute or relative) */
  directoryPath: string;
  /** Filter by file extensions (e.g., ['.ts', '.js']) */
  extensions?: string[];
  /** Configuration options */
  config: OperationConfig;
}

/**
 * Result data for list extensions operation.
 */
export interface ListExtensionsResult {
  /** Array of supported file extensions */
  extensions: string[];
  /** Number of supported extensions */
  count: number;
}

/**
 * Input parameters for list-todos operation.
 */
export interface ListTodosInput {
  /** Filter by tag (TODO, FIXME, HACK, XXX) */
  tag?: string;
  /** Filter by file path (partial match) */
  file?: string;
  /** Filter by category */
  category?: string;
  /** Maximum number of results (default: 100) */
  limit?: number;
  /** Offset for pagination (default: 0) */
  offset?: number;
  /** Configuration options */
  config: OperationConfig;
}

/**
 * Result data for list-todos operation.
 */
export interface ListTodosResult {
  /** Array of TODO items found */
  todos: TodoItem[];
  /** Total number of TODOs matching query */
  total: number;
  /** Number of TODOs returned in this response */
  count: number;
}

/**
 * Result data for get-todo-stats operation.
 */
export interface GetTodoStatsResult {
  /** Total count of all TODOs */
  total: number;
  /** Breakdown by tag */
  byTag: Array<{ tag: string; count: number }>;
  /** Breakdown by file */
  byFile: Array<{ file: string; count: number }>;
  /** Breakdown by category */
  byCategory: Array<{ category: string; count: number }>;
}

/**
 * Input parameters for watch-start operation.
 */
export interface WatchStartInput {
  /** Path to watch (default: current directory) */
  path?: string;
  /** Filter by file extensions */
  extensions?: string[];
  /** Gitignore filter (optional) */
  gitignoreFilter?: GitignoreFilter;
  /** Scan options */
  scanOptions?: ScanFileOptions;
}

/**
 * Result data for watch-start operation.
 */
export interface WatchStartResult {
  /** Whether watcher is active */
  watching: boolean;
  /** Path being watched */
  path: string;
}
