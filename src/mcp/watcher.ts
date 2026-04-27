import { watch, type FSWatcher } from 'chokidar';
import { resolve, relative, extname } from 'node:path';
import { scanFile, type ScanFileOptions } from './scanner.js';
import type { TodoItem, FileChangeEvent, TodoWatcher } from './types.js';
import type { GitignoreFilter } from './gitignore.js';

export function createWatcher(options?: {
  maxChanges?: number;
  gitignoreFilter?: GitignoreFilter;
  scanOptions?: ScanFileOptions;
}): TodoWatcher {
  const maxChanges = options?.maxChanges ?? 200;
  const gitignoreFilter = options?.gitignoreFilter ?? { ignores: () => false, ignoresDir: () => false };
  const scanOptions = options?.scanOptions;
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

    const handleFile = async (type: 'add' | 'change' | 'unlink', filePath: string) => {
      let todos: TodoItem[] = [];
      if (type !== 'unlink') {
        try {
          todos = await scanFile(filePath, scanOptions);
        } catch {
          // atomic write during file may be temporarily unreadable
        }
      }
      pushChange({ type, path: filePath, todos, timestamp: Date.now() });
    };

    await new Promise<void>((resolveReady, rejectReady) => {
      let isReady = false;

      fsWatcher = watch(absPath, {
        ignored: (filePath: string, stats?: { isFile(): boolean }) => {
          if (gitignoreFilter.ignores(relative(absPath, filePath))) return true;
          if (stats?.isFile() && extensions) {
            const ext = extname(filePath);
            return !extensions.includes(ext);
          }
          return false;
        },
        persistent: true,
        ignoreInitial: true,
        usePolling: true,
        interval: 100,
      });

      fsWatcher
        .once('ready', () => {
          isReady = true;
          resolveReady();
        })
        .on('error', (error) => {
          if (!isReady) {
            void fsWatcher?.close();
            fsWatcher = null;
            rejectReady(error);
          }
        });
    });

    const activeWatcher = fsWatcher;
    if (!activeWatcher) {
      throw new Error('Failed to start file watcher.');
    }

    activeWatcher
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
