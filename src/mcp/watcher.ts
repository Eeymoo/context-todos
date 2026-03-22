import { watch, type FSWatcher } from 'chokidar';
import { resolve } from 'node:path';
import { scanFile } from './scanner.js';
import type { TodoItem, FileChangeEvent, TodoWatcher } from './types.js';

const IGNORED = /node_modules|\.git|dist/;

/**
 * 创建文件监视器实例，用于监听文件/目录变更并自动重新扫描 TODO 注释。
 * 内部维护一个有限大小的变更事件缓冲区。
 * @param maxChanges - 缓冲区最大容量，超出时丢弃最早的事件（默认 200）
 * @returns 实现 TodoWatcher 接口的监视器对象
 */
export function createWatcher(maxChanges = 200): TodoWatcher {
  let fsWatcher: FSWatcher | null = null;
  let changes: FileChangeEvent[] = [];

  /**
   * 将变更事件推入缓冲区，超过 maxChanges 时截断最早的记录。
   * @param event - 文件变更事件
   */
  function pushChange(event: FileChangeEvent): void {
    changes.push(event);
    if (changes.length > maxChanges) {
      changes = changes.slice(-maxChanges);
    }
  }

  /**
   * 启动文件监视。若已存在监视器，则先停止再重新启动。
   * 使用 chokidar 监听文件的 add、change、unlink 事件。
   * @param path - 要监视的文件或目录路径
   * @param extensions - 可选的扩展名过滤列表
   */
  async function start(path: string, extensions?: string[]): Promise<void> {
    if (fsWatcher) {
      await stop();
    }

    const absPath = resolve(path);

    fsWatcher = watch(absPath, {
      ignored: (filePath: string, stats?: { isFile(): boolean }) => {
        if (IGNORED.test(filePath)) return true;
        if (stats?.isFile() && extensions) {
          const ext = '.' + filePath.split('.').pop();
          return !extensions.includes(ext);
        }
        return false;
      },
      persistent: true,
      ignoreInitial: true,
    });

    /**
     * 处理单个文件事件：扫描文件中的 TODO 注释并记录变更。
     * @param type - 事件类型（add / change / unlink）
     * @param filePath - 触发事件的文件路径
     */
    const handleFile = async (type: 'add' | 'change' | 'unlink', filePath: string) => {
      let todos: TodoItem[] = [];
      if (type !== 'unlink') {
        try {
          todos = await scanFile(filePath);
        } catch {
          // atomic write 期间文件可能暂时不可读
        }
      }
      pushChange({ type, path: filePath, todos, timestamp: Date.now() });
    };

    fsWatcher
      .on('add', (p: string) => handleFile('add', p))
      .on('change', (p: string) => handleFile('change', p))
      .on('unlink', (p: string) => handleFile('unlink', p));
  }

  /**
   * 停止文件监视并释放 chokidar 实例。
   */
  async function stop(): Promise<void> {
    if (fsWatcher) {
      await fsWatcher.close();
      fsWatcher = null;
    }
  }

  /**
   * 获取缓冲区中的变更事件。
   * @param since - 可选的 Unix 时间戳（毫秒），仅返回该时间之后的变更；省略则返回全部
   * @returns 满足条件的变更事件数组
   */
  function getChanges(since?: number): FileChangeEvent[] {
    if (since === undefined) return [...changes];
    return changes.filter((c) => c.timestamp > since);
  }

  /**
   * 清空变更事件缓冲区。
   */
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
