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
  ScanFileInput,
  ScanDirectoryInput,
} from './types.js';

export {
  EXTENSION_CANDIDATES,
  getSupportedExtensions,
  isExtensionSupported,
} from './extensions.js';

export { scanFileOperation } from './scan-file.js';

export { scanDirectoryOperation } from './scan-directory.js';

export { listExtensionsOperation } from './list-extensions.js';