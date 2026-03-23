import { watch, type FSWatcher } from 'chokidar';
import { resolve, relative, extname } from 'node:path';
import { scanFile } from './scanner.js';
import type { TodoItem, FileChangeEvent, TodoWatcher } from './types.js';
import type { GitignoreFilter } from './gitignore.js';

export function createWatcher(options?: {
  maxChanges?: number;
  gitignoreFilter?: GitignoreFilter;
}): TodoWatcher {
  const maxChanges = options?.maxChanges ?? 200;
  const gitignoreFilter = options?.gitignoreFilter ?? { ignores: () => false, ignoresDir: () => false };
  let fsWatcher: FSWatcher | null = null;
  let changes: FileChangeEvent[] = [];

  function pushChange(event: FileChangeEvent): void {
    changes.push(event);
    if (changes.length > maxChanges) {
      changes = changes.slice(-maxChanges);
    }
  }

  async function start(path: string, extensions?: string[]): Promise<void> {
    if (fsWatcher) {
      await stop();
    }

    const absPath = resolve(path);

    fsWatcher = watch(absPath, {
      ignored: (filePath: string, stats?: { isFile(): boolean }) => {
        if (gitignoreFilter.ignores(relative(absPath, filePath))) return true;
        if (stats?.isFile() && extensions) {
          /*
           * TODO(bug): Using string split for extension extraction is unreliable.
           * For files like 'archive.tar.gz' or 'component.test.tsx', this returns
           * only the last segment ('.gz' or '.tsx') instead of the full extension.
           * Should use extname() from 'node:path' for consistent behavior.
           * Example fix: const ext = extname(filePath);
           */
          const ext = '.' + filePath.split('.').pop();
          return !extensions.includes(ext);
        }
        return false;
      },
      persistent: true,
      ignoreInitial: true,
    });

    const handleFile = async (type: 'add' | 'change' | 'unlink', filePath: string) => {
      let todos: TodoItem[] = [];
      if (type !== 'unlink') {
        try {
          todos = await scanFile(filePath);
        } catch {
          // atomic write during file may be temporarily unreadable
        }
      }
      pushChange({ type, path: filePath, todos, timestamp: Date.now() });
    };

    fsWatcher
      .on('add', (p: string) => handleFile('add', p))
      .on('change', (p: string) => handleFile('change', p))
      .on('unlink', (p: string) => handleFile('unlink', p));
  }

  async function stop(): Promise<void> {
    if (fsWatcher) {
      await fsWatcher.close();
      fsWatcher = null;
    }
  }

  function getChanges(since?: number): FileChangeEvent[] {
    if (since === undefined) return [...changes];
    return changes.filter((c) => c.timestamp > since);
  }

  function clearChanges(): void {
    changes = [];
  }

  return {
    get watching() {
      return fsWatcher !== null;
    },
    start,
    stop,
    getChanges,
    clearChanges,
  };
}
