import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listTodosOperation } from '../../src/mcp/operations/list-todos.js';
import { initDb, getDb, syncFileTodos } from '../../src/mcp/db.js';
import { scanFile } from '../../src/mcp/scanner.js';
import type { OperationConfig } from '../../src/mcp/operations/types.js';

describe('listTodosOperation', () => {
  let testDir: string;
  const defaultConfig: OperationConfig = {};

  beforeEach(async () => {
    testDir = join(tmpdir(), `list-todos-op-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    await initDb(testDir);
  });

  afterEach(async () => {
    try {
      const db = getDb();
      await db.close();
    } catch {
      // DB might not be initialized
    }

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('basic functionality', () => {
    it('should return success with empty array when no todos exist', async () => {
      const result = await listTodosOperation({ config: defaultConfig });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos).toEqual([]);
        expect(result.data.total).toBe(0);
        expect(result.data.count).toBe(0);
      }
    });

    it('should return all todos when filters are not provided', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: Test todo\n// FIXME: Fix this\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await listTodosOperation({ config: defaultConfig });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos.length).toBe(2);
        expect(result.data.total).toBe(2);
        expect(result.data.count).toBe(2);
      }
    });
  });

  describe('filtering by tag', () => {
    it('should filter todos by tag', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: Todo item\n// FIXME: Fix item\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await listTodosOperation({ tag: 'TODO', config: defaultConfig });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos.length).toBe(1);
        expect(result.data.todos[0].tag).toBe('TODO');
      }
    });

    it('should return empty when tag has no matches', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: Test\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await listTodosOperation({ tag: 'XXX', config: defaultConfig });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos).toEqual([]);
        expect(result.data.total).toBe(0);
      }
    });
  });

  describe('filtering by file', () => {
    it('should filter todos by file path (partial match)', async () => {
      const file1 = join(testDir, 'component.ts');
      writeFileSync(file1, '// TODO: Component\n');
      const todos1 = await scanFile(file1);
      await syncFileTodos('component.ts', todos1);

      const file2 = join(testDir, 'util.ts');
      writeFileSync(file2, '// TODO: Util\n');
      const todos2 = await scanFile(file2);
      await syncFileTodos('util.ts', todos2);

      const result = await listTodosOperation({ file: 'component', config: defaultConfig });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos.length).toBe(1);
        expect(result.data.todos[0].file).toContain('component');
      }
    });
  });

  describe('filtering by category', () => {
    it('should filter todos by category', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO(feat): Feature todo\n// TODO(bug): Bug todo\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await listTodosOperation({ category: 'feat', config: defaultConfig });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos.length).toBe(1);
        expect(result.data.todos[0].category).toBe('feat');
      }
    });
  });

  describe('pagination', () => {
    it('should respect limit parameter', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: First\n// TODO: Second\n// TODO: Third\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await listTodosOperation({ limit: 2, config: defaultConfig });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos.length).toBe(2);
        expect(result.data.total).toBe(3);
        expect(result.data.count).toBe(2);
      }
    });

    it('should respect offset parameter', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: First\n// TODO: Second\n// TODO: Third\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await listTodosOperation({ offset: 1, config: defaultConfig });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos.length).toBe(2);
        expect(result.data.total).toBe(3);
      }
    });

    it('should combine limit and offset', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: First\n// TODO: Second\n// TODO: Third\n// TODO: Fourth\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await listTodosOperation({ limit: 2, offset: 1, config: defaultConfig });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos.length).toBe(2);
        expect(result.data.total).toBe(4);
      }
    });
  });

  describe('combined filters', () => {
    it('should apply multiple filters together', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO(feat): Feature\n// TODO(bug): Bug\n// FIXME(feat): Fix\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await listTodosOperation({
        tag: 'TODO',
        category: 'feat',
        config: defaultConfig,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.todos.length).toBe(1);
        expect(result.data.todos[0].tag).toBe('TODO');
        expect(result.data.todos[0].category).toBe('feat');
      }
    });
  });

  describe('error handling', () => {
    it('should return error when database is not initialized', async () => {
      // Close the database to simulate not initialized state
      const db = getDb();
      await db.close();

      const result = await listTodosOperation({ config: defaultConfig });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Error listing todos');
      }
    });
  });
});
