/**
 * Shared extension handling for operations module.
 *
 * This module provides a single source of truth for the EXTENSION_CANDIDATES
 * constant and related extension utilities used by both CLI and MCP tools.
 */

import { isExtensionSupported } from '../scanner.js';

/**
 * Array of file extension candidates for TODO scanning.
 * This is the master list used by both CLI and MCP tools.
 */
export const EXTENSION_CANDIDATES = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
  '.cs', '.php', '.swift', '.kt', '.scala', '.sh', '.bash',
  '.css', '.scss', '.less', '.html', '.vue', '.svelte',
  '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.sql', '.lua', '.r', '.m', '.mm', '.pl', '.pm',
  '.ex', '.exs', '.erl', '.hs', '.elm', '.clj', '.cljs',
  '.tf', '.hcl', '.dockerfile',
] as const;

/**
 * Get the list of supported file extensions by filtering candidates through leasot.
 *
 * @returns Array of supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return EXTENSION_CANDIDATES.filter((ext) => isExtensionSupported(ext));
}

/**
 * Re-export isExtensionSupported for convenience.
 */
export { isExtensionSupported };