import type { TodoItem } from './types.js';

export type OutputFormat = 'toon' | 'json' | 'pretty';

export interface Formatter {
  formatTodos(todos: TodoItem[]): string;
  formatStats(stats: {
    total: number;
    byTag: Record<string, number>;
    byCategory: Record<string, number>;
    topFiles: Array<{ file: string; count: number }>;
  }): string;
}

function formatTodoItem(item: TodoItem): string {
  let line = '[' + item.tag + (item.category ? '(' + item.category + ')' : '') + '] ' + item.file + ':' + item.line + ' - ' + item.text;
  if (item.ref) {
    line = line + ' (ref: ' + item.ref + ')';
  }
  return line;
}

function createToonFormatter(): Formatter {
  return {
    formatTodos(todos: TodoItem[]): string {
      return todos.map(formatTodoItem).join('\n');
    },
    formatStats(stats): string {
      const tagLines = Object.entries(stats.byTag)
        .map(([tag, count]) => `  ${tag}: ${count}`)
        .join('\n');
      const categoryLines = Object.entries(stats.byCategory)
        .map(([cat, count]) => `  ${cat}: ${count}`)
        .join('\n');
      const fileLines = stats.topFiles
        .map((f) => `  ${f.file}: ${f.count}`)
        .join('\n');
      return `Total TODOs: ${stats.total}\n\nBy Tag:\n${tagLines}\n\nBy Category:\n${categoryLines}\n\nTop Files:\n${fileLines}`;
    },
  };
}

function createJsonFormatter(): Formatter {
  return {
    formatTodos(todos: TodoItem[]): string {
      return JSON.stringify(todos, null, 2);
    },
    formatStats(stats): string {
      return JSON.stringify(stats, null, 2);
    },
  };
}

function createPrettyFormatter(): Formatter {
  return {
    formatTodos(todos: TodoItem[]): string {
      return todos.map((item) => {
        let line = `[${item.tag}${item.category ? '(' + item.category + ')' : ''}] ${item.file}:${item.line}\n    ${item.text}`;
        if (item.ref) {
          line += ` (ref: ${item.ref})`;
        }
        return line;
      }).join('\n\n');
    },
    formatStats(stats): string {
      const tagLines = Object.entries(stats.byTag)
        .map(([tag, count]) => `  ${tag}: ${count}`)
        .join('\n');
      const categoryLines = Object.entries(stats.byCategory)
        .map(([cat, count]) => `  ${cat}: ${count}`)
        .join('\n');
      const fileLines = stats.topFiles
        .map((f) => `  ${f.file}: ${f.count}`)
        .join('\n');
      return `Total TODOs: ${stats.total}\n\nBy Tag:\n${tagLines}\n\nBy Category:\n${categoryLines}\n\nTop Files:\n${fileLines}`;
    },
  };
}

export function createFormatter(format: OutputFormat = 'toon'): Formatter {
  switch (format) {
    case 'json':
      return createJsonFormatter();
    case 'pretty':
      return createPrettyFormatter();
    case 'toon':
    default:
      return createToonFormatter();
  }
}
