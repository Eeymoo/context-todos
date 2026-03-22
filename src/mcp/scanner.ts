import { parse, isExtensionSupported } from 'leasot';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import type { TodoItem } from './types.js';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist']);

/**
 * 递归收集目录中所有受支持的文件路径。
 * 自动跳过 node_modules、.git、dist 目录。
 * @param dir - 要扫描的根目录路径
 * @param extensions - 可选的扩展名过滤列表（如 ['.ts', '.js']），为空则收集所有支持的扩展名
 * @returns 匹配文件的绝对路径数组
 */
export function collectFiles(dir: string, extensions?: string[]): string[] {
  const files: string[] = [];

  function walk(current: string) {
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = resolve(current, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
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

/**
 * 扫描单个文件，提取其中的 TODO/FIXME/HACK/XXX 注释。
 * 若文件扩展名不受支持，则返回空数组。
 * @param filePath - 要扫描的文件路径
 * @returns 解析到的 TodoItem 数组
 */
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

  return todos as TodoItem[];
}

export { isExtensionSupported };
