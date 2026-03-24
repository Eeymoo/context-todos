import { parse, isExtensionSupported } from 'leasot';
import { readFileSync, readdir as readdirCb } from 'node:fs';
import { resolve, extname, relative } from 'node:path';
import { promisify } from 'node:util';
import type { TodoItem } from './types.js';
import type { GitignoreFilter } from './gitignore.js';

const readdir = promisify(readdirCb);

// Pattern to detect new TODO tags
const newTodoPattern = /\b(TODO|FIXME|HACK|XXX)\b/i;

/**
 * Detects the comment style of the line containing a TODO.
 * Returns 'block' for block comment style, 'line' for double-slash style, 'hash' for hash style.
 */
function detectCommentStyle(line: string): 'block' | 'line' | 'hash' | 'doubleDash' | null {
  // Check for block comment (inside /* */)
  if (line.includes('/*') || /^\s*\*\s*/.test(line)) {
    return 'block';
  }
  // Check for double-slash line comment
  if (/^\s*\/\//.test(line)) {
    return 'line';
  }
  // Check for hash comment
  if (/^\s*#/.test(line)) {
    return 'hash';
  }
  // Check for double-dash comment (Lua)
  if (/^\s*--/.test(line)) {
    return 'doubleDash';
  }
  return null;
}

/**
 * Gets the continuation pattern for a given comment style.
 */
function getContinuationPattern(style: 'block' | 'line' | 'hash' | 'doubleDash'): RegExp {
  switch (style) {
    case 'block':
      return /^\s*\*\s*/;
    case 'line':
      return /^\s*\/\/\s*/;
    case 'hash':
      return /^\s*#\s*/;
    case 'doubleDash':
      return /^\s*--\s*/;
  }
}

/**
 * Extracts continuation lines from source content after a TODO.
 * Returns the merged continuation text.
 */
function extractContinuationText(
  lines: string[],
  todoLineIndex: number // 0-indexed
): string {
  const todoLine = lines[todoLineIndex];
  if (!todoLine) return '';

  // Detect comment style from the TODO line
  const commentStyle = detectCommentStyle(todoLine);
  if (!commentStyle) return '';

  const pattern = getContinuationPattern(commentStyle);
  const continuationParts: string[] = [];

  for (let i = todoLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    // Check for end of block comment
    if (commentStyle === 'block' && line.includes('*/')) {
      break;
    }

    // Check if line matches continuation pattern
    const match = line.match(pattern);
    if (match) {
      const content = line.replace(pattern, '').trim();

      // Skip empty continuation lines
      if (!content) continue;

      // Stop if a new TODO tag is found
      if (newTodoPattern.test(content)) {
        break;
      }

      continuationParts.push(content);
    } else {
      // Line doesn't match continuation pattern, stop
      break;
    }
  }

  return continuationParts.join('\n');
}

/*
 * Collects all supported files from a directory recursively.
 * Optionally filters by extensions and applies gitignore/custom filters.
 */
export async function collectFiles(
  dir: string,
  extensions?: string[],
  gitignoreFilter?: GitignoreFilter | null
): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(current, entry.name);

      if (entry.isDirectory()) {
        const relDir = relative(dir, fullPath);
        if (gitignoreFilter?.ignoresDir(relDir)) continue;
        await walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = relative(dir, fullPath);
        if (gitignoreFilter?.ignores(relPath)) continue;

        const ext = extname(entry.name);
        if (ext && isExtensionSupported(ext)) {
          if (!extensions || extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    }
  }

  await walk(dir);
  return files;
}

export async function scanFile(filePath: string): Promise<TodoItem[]> {
  const ext = extname(filePath);
  if (!ext || !isExtensionSupported(ext)) {
    return [];
  }

  const contents = readFileSync(filePath, 'utf8');
  const lines = contents.split('\n');
  const todos = await parse(contents, {
    extension: ext,
    filename: filePath,
  });

  return (todos as TodoItem[]).map((todo) => {
    // Extract continuation text for multi-line TODOs
    const todoLineIndex = todo.line - 1; // Convert 1-indexed to 0-indexed
    const continuationText = extractContinuationText(lines, todoLineIndex);

    // Combine original text with continuation
    const finalText = continuationText ? `${todo.text}\n${continuationText}` : todo.text;

    // leasot already parses "TODO(feat): description" and puts "feat" in ref
    // Use ref as category if it exists
    const category = todo.ref ? todo.ref.toLowerCase() : undefined;

    return {
      ...todo,
      text: finalText,
      ...(category && { category }),
    };
  });
}

export { isExtensionSupported };
