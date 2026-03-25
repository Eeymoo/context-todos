/**
 * Operations module index file.
 *
 * This module exports all shared operations and types for use by both
 * CLI commands and MCP tools to eliminate code duplication.
 */

export type {
  OperationResult,
  OperationConfig,
  ScanFileResult,
  ScanDirectoryResult,
  ListExtensionsResult,
  ListTodosResult,
  GetTodoStatsResult,
  WatchStartResult,
  ScanFileInput,
  ScanDirectoryInput,
  ListTodosInput,
  WatchStartInput,
} from './types.js';

export {
  EXTENSION_CANDIDATES,
  getSupportedExtensions,
  isExtensionSupported,
} from './extensions.js';

export { scanFileOperation } from './scan-file.js';

export { scanDirectoryOperation } from './scan-directory.js';

export { listExtensionsOperation } from './list-extensions.js';

export { listTodosOperation } from './list-todos.js';

export { getTodoStatsOperation } from './get-todo-stats.js';

export { watchStartOperation } from './watch.js';
