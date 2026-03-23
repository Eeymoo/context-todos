import { parse, isExtensionSupported } from 'leasot';
import { readFileSync, readdir as readdirCb } from 'node:fs';
import { resolve, extname, relative } from 'node:path';
import { promisify } from 'node:util';
import type { TodoItem } from './types.js';
import type { GitignoreFilter } from './gitignore.js';

const readdir = promisify(readdirCb);

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
  const todos = await parse(contents, {
    extension: ext,
    filename: filePath,
  });

  return (todos as TodoItem[]).map((todo) => {
    const categoryMatch = todo.text.match(/^(TODO|FIXME|HACK|XXX)\((\w+)\):\s*(.*)$/i);
    if (categoryMatch && categoryMatch[2]) {
      return {
        ...todo,
        category: categoryMatch[2].toLowerCase(),
        text: categoryMatch[3] ?? '',
      };
    }
    return todo;
  });
}

export { isExtensionSupported };
