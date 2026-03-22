export interface TodoItem {
  file: string;
  tag: string;
  line: number;
  ref: string;
  text: string;
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  todos: TodoItem[];
  timestamp: number;
}

export interface TodoWatcher {
  readonly watching: boolean;
  start(path: string, extensions?: string[]): Promise<void>;
  stop(): Promise<void>;
  getChanges(since?: number): FileChangeEvent[];
  clearChanges(): void;
}

export type ServerMode = 'standard' | 'max' | 'labs';

export interface ServerOptions {
  mode: ServerMode;
  /** Directory to watch (default: '.') — used in max/labs mode */
  watchPath?: string;
  /** File extensions filter for watcher */
  extensions?: string[];
}
