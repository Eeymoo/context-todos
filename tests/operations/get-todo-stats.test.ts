import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getTodoStatsOperation } from '../../src/mcp/operations/get-todo-stats.js';
import { initDb, getDb, syncFileTodos } from '../../src/mcp/db.js';
import { scanFile } from '../../src/mcp/scanner.js';

describe('getTodoStatsOperation', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `get-todo-stats-op-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    await initDb(testDir);
  });

  afterEach(async () => {
    try {
      const db = getDb();
      await db.close();
    } catch {
      // ignore
    }

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('basic functionality', () => {
    it('should return success with zero stats when no todos exist', async () => {
      const result = await getTodoStatsOperation();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(0);
        expect(result.data.byTag).toEqual([]);
        expect(result.data.byFile).toEqual([]);
        expect(result.data.byCategory).toEqual([]);
      }
    });

    it('should return correct total count', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: First\n// TODO: Second\n// FIXME: Third\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await getTodoStatsOperation();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(3);
      }
    });
  });

  describe('byTag breakdown', () => {
    it('should return correct breakdown by tag', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: First\n// TODO: Second\n// FIXME: Third\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await getTodoStatsOperation();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.byTag.length).toBe(2);
        const todoTag = result.data.byTag.find(t => t.tag === 'TODO');
        const fixmeTag = result.data.byTag.find(t => t.tag === 'FIXME');
        expect(todoTag?.count).toBe(2);
        expect(fixmeTag?.count).toBe(1);
      }
    });

    it('should sort tags by count descending', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: A\n// TODO: B\n// TODO: C\n// FIXME: D\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await getTodoStatsOperation();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.byTag[0].tag).toBe('TODO');
        expect(result.data.byTag[0].count).toBe(3);
        expect(result.data.byTag[1].tag).toBe('FIXME');
        expect(result.data.byTag[1].count).toBe(1);
      }
    });
  });

  describe('byFile breakdown', () => {
    it('should return correct breakdown by file', async () => {
      const file1 = join(testDir, 'file1.ts');
      writeFileSync(file1, '// TODO: A\n// TODO: B\n');
      const todos1 = await scanFile(file1);
      await syncFileTodos('file1.ts', todos1);

      const file2 = join(testDir, 'file2.ts');
      writeFileSync(file2, '// TODO: C\n');
      const todos2 = await scanFile(file2);
      await syncFileTodos('file2.ts', todos2);

      const result = await getTodoStatsOperation();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.byFile.length).toBe(2);
        // Files are stored by their sync key, check partial match
        const file1Stat = result.data.byFile.find(f => f.file.includes('file1'));
        const file2Stat = result.data.byFile.find(f => f.file.includes('file2'));
        expect(file1Stat?.count).toBe(2);
        expect(file2Stat?.count).toBe(1);
      }
    });

    it('should return file entries with count property', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: Test\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await getTodoStatsOperation();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.byFile.length).toBeGreaterThan(0);
        expect(result.data.byFile[0]).toHaveProperty('file');
        expect(result.data.byFile[0]).toHaveProperty('count');
        expect(typeof result.data.byFile[0].file).toBe('string');
        expect(typeof result.data.byFile[0].count).toBe('number');
      }
    });
  });

  describe('byCategory breakdown', () => {
    it('should return correct breakdown by category', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO(feat): Feature\n// TODO(bug): Bug\n// TODO(feat): Another\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      const result = await getTodoStatsOperation();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.byCategory.length).toBe(2);
        const featCat = result.data.byCategory.find(c => c.category === 'feat');
        const bugCat = result.data.byCategory.find(c => c.category === 'bug');
        expect(featCat?.count).toBe(2);
        expect(bugCat?.count).toBe(1);
      }
    });
  });

  describe('error handling', () => {
    it('should return error when database is not initialized', async () => {
      const db = getDb();
      await db.close();

      const result = await getTodoStatsOperation();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Error getting todo stats');
      }
    });
  });
});
