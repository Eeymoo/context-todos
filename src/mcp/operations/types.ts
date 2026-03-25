/**
 * Shared types for operations module.
 *
 * This module defines common types used by all operations to ensure
 * consistent error handling and configuration across CLI and MCP tools.
 */

import type { TodoItem } from '../types.js';
import type { OutputFormat } from '../formatter.js';

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
 * Result data for list extensions operation.
 */
export interface ListExtensionsResult {
  /** Array of supported file extensions */
  extensions: string[];
  /** Number of supported extensions */
  count: number;
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
 * Input parameters for scan-directory operation.
 */
export interface ScanDirectoryInput {
  /** Directory path to scan (absolute or relative) */
  directoryPath: string;
  /** Optional array of file extensions to filter by */
  extensions?: string[];
  /** Configuration options */
  config: OperationConfig;
}
