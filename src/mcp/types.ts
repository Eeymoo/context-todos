export interface TodoItem {
  file: string;
  tag: string;
  line: number;
  ref: string;
  text: string;
  category?: string;
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
export type ServerMode = 'standard' | 'max' | 'labs-standard' | 'labs-max';
export interface ModeConfig {
  enableWatcher: boolean;
  enableDatabase: boolean;
  enableGetTodoStats: boolean;
}
export const modeConfigs: Record<ServerMode, ModeConfig> = {
  standard: {
    enableWatcher: false,
    enableDatabase: false,
    enableGetTodoStats: false,
  },
  max: {
    enableWatcher: true,
    enableDatabase: true,
    enableGetTodoStats: false,
  },
  'labs-standard': {
    enableWatcher: false,
    enableDatabase: false,
    enableGetTodoStats: false,
  },
  'labs-max': {
    enableWatcher: true,
    enableDatabase: true,
    enableGetTodoStats: true,
  },
};
export interface ServerOptions {
  mode: ServerMode;
  watchPath?: string;
  extensions?: string[];
  useGitignore?: boolean;
  gitignorePath?: string;
}
