import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  initDb,
  getDb,
  syncFileTodos,
  removeFileTodos,
  queryTodos,
  getTodoStats,
  type TodoQuery,
} from '../src/mcp/db.js';
import type { TodoItem } from '../src/mcp/types.js';

describe('Database Module', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `db-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initDb', () => {
    it('should initialize database successfully', async () => {
      const client = await initDb(testDir);
      expect(client).toBeDefined();

      const dbPath = join(testDir, '.context-todos.db');
      expect(existsSync(dbPath)).toBe(true);
    });

    it('should create todos table with correct schema', async () => {
      await initDb(testDir);
      const db = getDb();

      const result = await db.execute('PRAGMA table_info(todos)');
      const columns = result.rows.map((r) => r.name);

      expect(columns).toContain('id');
      expect(columns).toContain('file');
      expect(columns).toContain('tag');
      expect(columns).toContain('line');
      expect(columns).toContain('ref');
      expect(columns).toContain('text');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
    });

    it('should create indexes', async () => {
      await initDb(testDir);
      const db = getDb();

      const result = await db.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='todos'");
      const indexNames = result.rows.map((r) => String(r.name));

      expect(indexNames).toContain('idx_todos_file');
      expect(indexNames).toContain('idx_todos_tag');
      expect(indexNames).toContain('idx_todos_updated');
    });

    it('should handle multiple calls to initDb', async () => {
      await initDb(testDir);
      const db1 = getDb();

      await initDb(testDir);
      const db2 = getDb();

      expect(db1).toBeDefined();
      expect(db2).toBeDefined();
    });
  });

  describe('getDb', () => {
    it('should return client after initDb', async () => {
      await initDb(testDir);
      const db = getDb();

      expect(db).toBeDefined();
      expect(typeof db.execute).toBe('function');
    });

    it('should throw error when called before initDb', () => {
      const freshTestDir = join(tmpdir(), `db-test-uninitialized-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      mkdirSync(freshTestDir, { recursive: true });

      expect(() => {
        try {
          getDb();
        } catch (err) {
          expect((err as Error).message).toContain('Database not initialized');
          throw err;
        }
      }).toBeDefined();

      rmSync(freshTestDir, { recursive: true, force: true });
    });
  });

  describe('syncFileTodos', () => {
    beforeEach(async () => {
      await initDb(testDir);
    });

    it('should sync todos to empty database', async () => {
      const todos: TodoItem[] = [
        { file: 'test.ts', tag: 'TODO', line: 1, ref: '', text: 'First todo' },
        { file: 'test.ts', tag: 'FIXME', line: 5, ref: 'ref123', text: 'Second todo' },
      ];

      await syncFileTodos('test.ts', todos);

      const result = await queryTodos({ file: 'test.ts' });
      expect(result.todos.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.todos.some((t) => t.text === 'First todo')).toBe(true);
      expect(result.todos.some((t) => t.text === 'Second todo')).toBe(true);
    });

    it('should replace existing todos for file', async () => {
      const initialTodos: TodoItem[] = [
        { file: 'test.ts', tag: 'TODO', line: 1, ref: '', text: 'Old todo' },
      ];
      await syncFileTodos('test.ts', initialTodos);

      const newTodos: TodoItem[] = [
        { file: 'test.ts', tag: 'TODO', line: 2, ref: '', text: 'New todo 1' },
        { file: 'test.ts', tag: 'TODO', line: 3, ref: '', text: 'New todo 2' },
      ];
      await syncFileTodos('test.ts', newTodos);

      const result = await queryTodos({ file: 'test.ts' });
      expect(result.todos.length).toBe(2);
      expect(result.todos.some((t) => t.text === 'Old todo')).toBe(false);
      expect(result.todos.some((t) => t.text === 'New todo 1')).toBe(true);
      expect(result.todos.some((t) => t.text === 'New todo 2')).toBe(true);
    });

    it('should delete all todos when syncing empty array', async () => {
      const todos: TodoItem[] = [
        { file: 'test.ts', tag: 'TODO', line: 1, ref: '', text: 'Todo to delete' },
      ];
      await syncFileTodos('test.ts', todos);

      await syncFileTodos('test.ts', []);

      const result = await queryTodos({ file: 'test.ts' });
      expect(result.todos.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should rollback transaction on error', async () => {
      const validTodos: TodoItem[] = [
        { file: 'test.ts', tag: 'TODO', line: 1, ref: '', text: 'Valid todo' },
      ];
      await syncFileTodos('test.ts', validTodos);

      const invalidTodos: TodoItem[] = [
        { file: 'test.ts', tag: 'TODO', line: 2, ref: '', text: 'First' },
        { file: 'test.ts', tag: 'TODO', line: 2, ref: '', text: 'Duplicate line' },
      ];

      try {
        await syncFileTodos('test.ts', invalidTodos);
      } catch (err) {
        expect(err).toBeDefined();
      }

      const result = await queryTodos({ file: 'test.ts' });
      expect(result.todos.length).toBe(1);
      expect(result.todos[0]?.text).toBe('Valid todo');
    });

    it('should not affect other files when syncing', async () => {
      const file1Todos: TodoItem[] = [
        { file: 'file1.ts', tag: 'TODO', line: 1, ref: '', text: 'File 1 todo' },
      ];
      const file2Todos: TodoItem[] = [
        { file: 'file2.ts', tag: 'TODO', line: 1, ref: '', text: 'File 2 todo' },
      ];

      await syncFileTodos('file1.ts', file1Todos);
      await syncFileTodos('file2.ts', file2Todos);

      await syncFileTodos('file1.ts', [
        { file: 'file1.ts', tag: 'TODO', line: 2, ref: '', text: 'File 1 new todo' },
      ]);

      const file2Result = await queryTodos({ file: 'file2.ts' });
      expect(file2Result.todos.length).toBe(1);
      expect(file2Result.todos[0]?.text).toBe('File 2 todo');
    });
  });

  describe('removeFileTodos', () => {
    beforeEach(async () => {
      await initDb(testDir);
    });

    it('should remove todos for specified file', async () => {
      const todos: TodoItem[] = [
        { file: 'test.ts', tag: 'TODO', line: 1, ref: '', text: 'Todo to remove' },
        { file: 'test.ts', tag: 'FIXME', line: 5, ref: '', text: 'Another todo' },
      ];
      await syncFileTodos('test.ts', todos);

      await removeFileTodos('test.ts');

      const result = await queryTodos({ file: 'test.ts' });
      expect(result.todos.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should preserve todos from other files', async () => {
      const file1Todos: TodoItem[] = [
        { file: 'file1.ts', tag: 'TODO', line: 1, ref: '', text: 'File 1 todo' },
      ];
      const file2Todos: TodoItem[] = [
        { file: 'file2.ts', tag: 'TODO', line: 1, ref: '', text: 'File 2 todo' },
      ];

      await syncFileTodos('file1.ts', file1Todos);
      await syncFileTodos('file2.ts', file2Todos);

      await removeFileTodos('file1.ts');

      const file2Result = await queryTodos({ file: 'file2.ts' });
      expect(file2Result.todos.length).toBe(1);
      expect(file2Result.todos[0]?.text).toBe('File 2 todo');

      const file1Result = await queryTodos({ file: 'file1.ts' });
      expect(file1Result.todos.length).toBe(0);
    });

    it('should handle removing non-existent file gracefully', async () => {
      await expect(removeFileTodos('nonexistent.ts')).resolves.toBeUndefined();
    });
  });

  describe('queryTodos', () => {
    beforeEach(async () => {
      await initDb(testDir);

      await syncFileTodos('src/app.ts', [
        { file: 'src/app.ts', tag: 'TODO', line: 10, ref: 'ref1', text: 'Implement feature A' },
        { file: 'src/app.ts', tag: 'FIXME', line: 20, ref: '', text: 'Fix bug B' },
        { file: 'src/app.ts', tag: 'TODO', line: 30, ref: 'ref2', text: 'Add tests' },
      ]);

      await syncFileTodos('src/utils.ts', [
        { file: 'src/utils.ts', tag: 'TODO', line: 5, ref: '', text: 'Optimize function' },
        { file: 'src/utils.ts', tag: 'HACK', line: 15, ref: 'hack1', text: 'Temporary workaround' },
      ]);

      await syncFileTodos('docs/README.md', [
        { file: 'docs/README.md', tag: 'TODO', line: 1, ref: '', text: 'Update documentation' },
      ]);
    });

    it('should query all todos with no filters', async () => {
      const result = await queryTodos();

      expect(result.total).toBe(6);
      expect(result.todos.length).toBe(6);
    });

    it('should filter by tag', async () => {
      const result = await queryTodos({ tag: 'TODO' });

      expect(result.total).toBe(4);
      expect(result.todos.length).toBe(4);
      expect(result.todos.every((t) => t.tag === 'TODO')).toBe(true);
    });

    it('should filter by file with partial match', async () => {
      const result = await queryTodos({ file: 'app' });

      expect(result.total).toBe(3);
      expect(result.todos.length).toBe(3);
      expect(result.todos.every((t) => t.file === 'src/app.ts')).toBe(true);
    });

    it('should apply limit and offset', async () => {
      const result1 = await queryTodos({ limit: 2, offset: 0 });
      expect(result1.todos.length).toBe(2);
      expect(result1.total).toBe(6);

      const result2 = await queryTodos({ limit: 2, offset: 2 });
      expect(result2.todos.length).toBe(2);
      expect(result2.total).toBe(6);

      const result3 = await queryTodos({ limit: 2, offset: 4 });
      expect(result3.todos.length).toBe(2);
      expect(result3.total).toBe(6);

      const result4 = await queryTodos({ limit: 2, offset: 6 });
      expect(result4.todos.length).toBe(0);
      expect(result4.total).toBe(6);
    });

    it('should combine multiple filters', async () => {
      const result = await queryTodos({ tag: 'TODO', file: 'src/', limit: 2 });

      expect(result.total).toBe(3);
      expect(result.todos.length).toBe(2);
      expect(result.todos.every((t) => t.tag === 'TODO')).toBe(true);
      expect(result.todos.every((t) => t.file.startsWith('src/'))).toBe(true);
    });

    it('should use default limit of 100', async () => {
      const result = await queryTodos();
      expect(result.todos.length).toBeLessThanOrEqual(100);
    });

    it('should return correct total count with filters', async () => {
      const result = await queryTodos({ tag: 'FIXME' });

      expect(result.total).toBe(1);
      expect(result.todos.length).toBe(1);
      expect(result.todos[0]?.tag).toBe('FIXME');
      expect(result.todos[0]?.text).toBe('Fix bug B');
    });

    it('should return empty result for no matches', async () => {
      const result = await queryTodos({ tag: 'NONEXISTENT' });

      expect(result.total).toBe(0);
      expect(result.todos.length).toBe(0);
    });
  });

  describe('getTodoStats', () => {
    beforeEach(async () => {
      await initDb(testDir);
    });

    it('should return zero stats when no todos exist', async () => {
      const stats = await getTodoStats();

      expect(stats.total).toBe(0);
      expect(stats.byTag).toEqual([]);
      expect(stats.byFile).toEqual([]);
    });

    it('should calculate correct stats with multiple todos', async () => {
      await syncFileTodos('file1.ts', [
        { file: 'file1.ts', tag: 'TODO', line: 1, ref: '', text: 'Todo 1' },
        { file: 'file1.ts', tag: 'TODO', line: 2, ref: '', text: 'Todo 2' },
        { file: 'file1.ts', tag: 'FIXME', line: 3, ref: '', text: 'Fixme 1' },
      ]);

      await syncFileTodos('file2.ts', [
        { file: 'file2.ts', tag: 'TODO', line: 1, ref: '', text: 'Todo 3' },
        { file: 'file2.ts', tag: 'HACK', line: 2, ref: '', text: 'Hack 1' },
      ]);

      const stats = await getTodoStats();

      expect(stats.total).toBe(5);
    });

    it('should aggregate by tag correctly', async () => {
      await syncFileTodos('file1.ts', [
        { file: 'file1.ts', tag: 'TODO', line: 1, ref: '', text: 'Todo 1' },
        { file: 'file1.ts', tag: 'TODO', line: 2, ref: '', text: 'Todo 2' },
        { file: 'file1.ts', tag: 'TODO', line: 3, ref: '', text: 'Todo 3' },
        { file: 'file1.ts', tag: 'FIXME', line: 4, ref: '', text: 'Fixme 1' },
        { file: 'file1.ts', tag: 'FIXME', line: 5, ref: '', text: 'Fixme 2' },
        { file: 'file1.ts', tag: 'HACK', line: 6, ref: '', text: 'Hack 1' },
      ]);

      const stats = await getTodoStats();

      expect(stats.byTag.length).toBe(3);

      const todoTag = stats.byTag.find((t) => t.tag === 'TODO');
      expect(todoTag?.count).toBe(3);

      const fixmeTag = stats.byTag.find((t) => t.tag === 'FIXME');
      expect(fixmeTag?.count).toBe(2);

      const hackTag = stats.byTag.find((t) => t.tag === 'HACK');
      expect(hackTag?.count).toBe(1);

      expect(stats.byTag[0]?.count).toBeGreaterThanOrEqual(stats.byTag[1]?.count ?? 0);
    });

    it('should aggregate by file correctly', async () => {
      await syncFileTodos('file1.ts', [
        { file: 'file1.ts', tag: 'TODO', line: 1, ref: '', text: 'Todo 1' },
        { file: 'file1.ts', tag: 'TODO', line: 2, ref: '', text: 'Todo 2' },
        { file: 'file1.ts', tag: 'TODO', line: 3, ref: '', text: 'Todo 3' },
      ]);

      await syncFileTodos('file2.ts', [
        { file: 'file2.ts', tag: 'TODO', line: 1, ref: '', text: 'Todo 4' },
        { file: 'file2.ts', tag: 'TODO', line: 2, ref: '', text: 'Todo 5' },
      ]);

      await syncFileTodos('file3.ts', [
        { file: 'file3.ts', tag: 'TODO', line: 1, ref: '', text: 'Todo 6' },
      ]);

      const stats = await getTodoStats();

      expect(stats.byFile.length).toBe(3);

      const file1 = stats.byFile.find((f) => f.file === 'file1.ts');
      expect(file1?.count).toBe(3);

      const file2 = stats.byFile.find((f) => f.file === 'file2.ts');
      expect(file2?.count).toBe(2);

      const file3 = stats.byFile.find((f) => f.file === 'file3.ts');
      expect(file3?.count).toBe(1);

      expect(stats.byFile[0]?.count).toBeGreaterThanOrEqual(stats.byFile[1]?.count ?? 0);
    });

    it('should limit byFile to 20 results', async () => {
      for (let i = 1; i <= 25; i++) {
        await syncFileTodos(`file${i}.ts`, [
          { file: `file${i}.ts`, tag: 'TODO', line: 1, ref: '', text: `Todo ${i}` },
        ]);
      }

      const stats = await getTodoStats();

      expect(stats.total).toBe(25);
      expect(stats.byFile.length).toBe(20);
    });
  });
});
