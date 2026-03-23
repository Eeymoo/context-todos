import { parse, isExtensionSupported } from 'leasot';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname, relative } from 'node:path';
import type { TodoItem } from './types.js';
import type { GitignoreFilter } from './gitignore.js';

/*
 * TODO(performance): Replace synchronous readdirSync with async fs.promises.readdir
 * to avoid blocking the event loop when scanning large projects.
 * Consider implementing an async generator pattern for better scalability.
 * See: https://nodejs.org/api/fs.html#fs_fspromises_readdir_path_options
 */
export function collectFiles(
  dir: string,
  extensions?: string[],
  gitignoreFilter?: GitignoreFilter | null
): string[] {
  const files: string[] = [];

  function walk(current: string) {
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(current, entry.name);

      if (entry.isDirectory()) {
        const relDir = relative(dir, fullPath);
        if (gitignoreFilter?.ignoresDir(relDir)) continue;
        walk(fullPath);
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

  walk(dir);
  return files;
}

export async function scanFile(filePath: string): Promise<TodoItem[]> {
  const ext = extname(filePath);
  if (!ext || !isExtensionSupported(ext)) {
    return [];
  }

  const contents = readFileSync(filePath, 'utf8');
  const todos = await parse(contents, {
    extension: ext,
    filename: filePath,
  });

  /*
   * TODO(feat): Extract category from todo text.
   * Parse category from formats like "TODO(performance): description"
   * Use regex: /^(TODO|FIXME|HACK|XXX)\((\w+)\):\s*(.*)$/
   * Add category field to each todo item.
   */
  return todos as TodoItem[];
}

export { isExtensionSupported };
