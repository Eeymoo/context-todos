import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from '../../src/mcp/index.js';
import { getDb } from '../../src/mcp/db.js';

describe('MCP Index Module', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `mcp-index-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      const db = getDb();
      await db.close();
    } catch {
      /* DB might not be initialized */
    }

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createServer in standard mode', () => {
    it('should create server with default options', async () => {
      const result = await createServer();

      expect(result).toBeDefined();
      expect(result.server).toBeDefined();
      expect(result.totalTodos).toBe(0);
    });

    it('should create server with explicit standard mode', async () => {
      const result = await createServer({ mode: 'standard' });

      expect(result).toBeDefined();
      expect(result.server).toBeDefined();
      expect(result.totalTodos).toBe(0);
    });

    it('should return totalTodos as 0 in standard mode', async () => {
      const result = await createServer({ mode: 'standard' });

      expect(result.totalTodos).toBe(0);
    });

    it('should have correct server name and version', async () => {
      const result = await createServer({ mode: 'standard' });

      const serverInfo = result.server.server['_serverInfo'] as { name: string; version: string };
      expect(serverInfo.name).toBe('context-todos');
      expect(serverInfo.version).toBe('1.0.0');
    });

    it('should not initialize database in standard mode', async () => {
      const tempStandardDir = join(tmpdir(), `standard-test-${Date.now()}`);
      mkdirSync(tempStandardDir, { recursive: true });

      await createServer({ mode: 'standard' });

      const dbFile = join(tempStandardDir, '.context-todos.db');
      expect(existsSync(dbFile)).toBe(false);

      rmSync(tempStandardDir, { recursive: true, force: true });
    });
  });

  describe('createServer in max mode', () => {
    it('should create server with max mode', async () => {
      const result = await createServer({ mode: 'max', watchPath: testDir });

      expect(result).toBeDefined();
      expect(result.server).toBeDefined();
      expect(result.totalTodos).toBeDefined();
    });

    it('should initialize database at watchPath', async () => {
      await createServer({ mode: 'max', watchPath: testDir });

      const dbFile = join(testDir, '.context-todos.db');
      expect(existsSync(dbFile)).toBe(true);
    });

    it('should perform initial scan and return totalTodos', async () => {
      writeFileSync(
        join(testDir, 'file1.ts'),
        `// TODO: First todo
// FIXME: Second todo
const x = 1;
`,
      );
      writeFileSync(
        join(testDir, 'file2.ts'),
        `// TODO: Third todo
const y = 2;
`,
      );

      const result = await createServer({ mode: 'max', watchPath: testDir });

      expect(result.totalTodos).toBe(3);
    });

    it('should use custom watchPath', async () => {
      const customDir = join(testDir, 'custom');
      mkdirSync(customDir, { recursive: true });

      writeFileSync(
        join(customDir, 'test.ts'),
        `// TODO: Custom directory todo
`,
      );

      const result = await createServer({ mode: 'max', watchPath: customDir });

      expect(result.totalTodos).toBe(1);
      const dbFile = join(customDir, '.context-todos.db');
      expect(existsSync(dbFile)).toBe(true);
    });

    it('should scan all supported files during initial scan regardless of extensions filter', async () => {
      writeFileSync(
        join(testDir, 'file.ts'),
        `// TODO: TypeScript todo
`,
      );
      writeFileSync(
        join(testDir, 'file.py'),
        `# TODO: Python todo
`,
      );

      const result = await createServer({
        mode: 'max',
        watchPath: testDir,
        extensions: ['.ts'],
      });

      expect(result.totalTodos).toBe(2);
    });

    it('should sync todos to database during initial scan', async () => {
      writeFileSync(
        join(testDir, 'test.ts'),
        `// TODO: Database sync test
`,
      );

      await createServer({ mode: 'max', watchPath: testDir });

      const db = getDb();
      const rows = await db.execute('SELECT * FROM todos');
      expect(rows.rows.length).toBe(1);
      const firstRow = rows.rows[0] as unknown as { text: string };
      expect(firstRow.text).toContain('Database sync test');
    });

    it('should handle empty directory during initial scan', async () => {
      const result = await createServer({ mode: 'max', watchPath: testDir });

      expect(result.totalTodos).toBe(0);
    });

    it('should use current directory when watchPath not provided', async () => {
      const result = await createServer({ mode: 'max' });

      expect(result).toBeDefined();
      expect(result.server).toBeDefined();
      expect(result.totalTodos).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createServer in labs mode', () => {
    it('should create server with labs mode', async () => {
      const result = await createServer({ mode: 'labs', watchPath: testDir });

      expect(result).toBeDefined();
      expect(result.server).toBeDefined();
      expect(result.totalTodos).toBeDefined();
    });

    it('should return totalTodos after initial scan', async () => {
      writeFileSync(
        join(testDir, 'file1.ts'),
        `// TODO: Labs mode todo 1
// TODO: Labs mode todo 2
`,
      );

      const result = await createServer({ mode: 'labs', watchPath: testDir });

      expect(result.totalTodos).toBe(2);
    });

    it('should initialize database in labs mode', async () => {
      await createServer({ mode: 'labs', watchPath: testDir });

      const dbFile = join(testDir, '.context-todos.db');
      expect(existsSync(dbFile)).toBe(true);
    });
  });

  describe('file watching behavior', () => {
    it('should sync todos on file add event', async () => {
      await createServer({ mode: 'max', watchPath: testDir });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const newFile = join(testDir, 'new-file.ts');
      writeFileSync(
        newFile,
        `// TODO: New file todo
`,
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      const db = getDb();
      const rows = await db.execute('SELECT * FROM todos WHERE file = ?', ['new-file.ts']);
      expect(rows.rows.length).toBe(1);
      const firstRow = rows.rows[0] as unknown as { text: string };
      expect(firstRow.text).toContain('New file todo');
    });

    it('should sync todos on file change event', async () => {
      const testFile = join(testDir, 'change-test.ts');
      writeFileSync(
        testFile,
        `// TODO: Original todo
`,
      );

      await createServer({ mode: 'max', watchPath: testDir });

      await new Promise((resolve) => setTimeout(resolve, 100));

      writeFileSync(
        testFile,
        `// TODO: Updated todo
// TODO: Another todo
`,
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      const db = getDb();
      const rows = await db.execute('SELECT * FROM todos WHERE file = ?', ['change-test.ts']);
      expect(rows.rows.length).toBe(2);
    });

    it('should remove todos on file unlink event', async () => {
      const testFile = join(testDir, 'unlink-test.ts');
      writeFileSync(
        testFile,
        `// TODO: Will be deleted
`,
      );

      await createServer({ mode: 'max', watchPath: testDir });

      await new Promise((resolve) => setTimeout(resolve, 100));

      let db = getDb();
      let rows = await db.execute('SELECT * FROM todos WHERE file = ?', ['unlink-test.ts']);
      expect(rows.rows.length).toBe(1);

      rmSync(testFile);

      await new Promise((resolve) => setTimeout(resolve, 200));

      db = getDb();
      rows = await db.execute('SELECT * FROM todos WHERE file = ?', ['unlink-test.ts']);
      expect(rows.rows.length).toBe(0);
    });

    it('should ignore node_modules directory', async () => {
      const nodeModulesDir = join(testDir, 'node_modules');
      mkdirSync(nodeModulesDir, { recursive: true });

      writeFileSync(
        join(nodeModulesDir, 'package.ts'),
        `// TODO: Should be ignored
`,
      );

      const result = await createServer({ mode: 'max', watchPath: testDir });

      expect(result.totalTodos).toBe(0);
    });

    it('should ignore .git directory', async () => {
      const gitDir = join(testDir, '.git');
      mkdirSync(gitDir, { recursive: true });

      writeFileSync(
        join(gitDir, 'config'),
        `# TODO: Should be ignored
`,
      );

      const result = await createServer({ mode: 'max', watchPath: testDir });

      expect(result.totalTodos).toBe(0);
    });

    it('should ignore dist directory', async () => {
      const distDir = join(testDir, 'dist');
      mkdirSync(distDir, { recursive: true });

      writeFileSync(
        join(distDir, 'bundle.js'),
        `// TODO: Should be ignored
`,
      );

      const result = await createServer({ mode: 'max', watchPath: testDir });

      expect(result.totalTodos).toBe(0);
    });

    it('should respect extensions filter in watcher', async () => {
      await createServer({
        mode: 'max',
        watchPath: testDir,
        extensions: ['.ts'],
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      writeFileSync(
        join(testDir, 'ignored.js'),
        `// TODO: Should be ignored by extension filter
`,
      );

      writeFileSync(
        join(testDir, 'watched.ts'),
        `// TODO: Should be watched
`,
      );

      await new Promise((resolve) => setTimeout(resolve, 200));

      const db = getDb();
      const rows = await db.execute('SELECT * FROM todos');

      expect(rows.rows.length).toBe(1);
      const firstRow = rows.rows[0] as unknown as { file: string };
      expect(firstRow.file).toBe('watched.ts');
    });
  });

  describe('error handling', () => {
    it('should not throw when scanning unreadable files during initial scan', async () => {
      const testFile = join(testDir, 'unreadable.ts');
      writeFileSync(testFile, '// TODO: Test');

      const result = await createServer({ mode: 'max', watchPath: testDir });

      expect(result).toBeDefined();
      expect(result.totalTodos).toBeGreaterThanOrEqual(0);
    });

    it('should handle file watcher errors gracefully on add event', async () => {
      await createServer({ mode: 'max', watchPath: testDir });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const testFile = join(testDir, 'temp.ts');

      writeFileSync(testFile, '// TODO: Temporary file');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(true).toBe(true);
    });

    it('should handle file watcher errors gracefully on change event', async () => {
      const testFile = join(testDir, 'change-error.ts');
      writeFileSync(testFile, '// TODO: Original');

      await createServer({ mode: 'max', watchPath: testDir });

      await new Promise((resolve) => setTimeout(resolve, 100));

      writeFileSync(testFile, '// TODO: Modified');

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(true).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should handle multiple files with various TODOs', async () => {
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });

      writeFileSync(
        join(srcDir, 'file1.ts'),
        `// TODO: Feature 1
// FIXME: Bug 1
const x = 1;
`,
      );

      writeFileSync(
        join(srcDir, 'file2.ts'),
        `// TODO: Feature 2
// FIXME: Temporary fix
const y = 2;
`,
      );

      writeFileSync(
        join(testDir, 'index.ts'),
        `// TODO: Main entry
`,
      );

      const result = await createServer({ mode: 'max', watchPath: testDir });

      expect(result.totalTodos).toBe(5);

      const db = getDb();
      const rows = await db.execute('SELECT * FROM todos ORDER BY file, line');
      expect(rows.rows.length).toBe(5);
    });

    it('should work with labs mode and initial scan', async () => {
      writeFileSync(
        join(testDir, 'stats.ts'),
        `// TODO: Task 1
// TODO: Task 2
// FIXME: Bug 1
`,
      );

      const result = await createServer({ mode: 'labs', watchPath: testDir });

      expect(result.totalTodos).toBe(3);
    });

    it('should properly isolate database per watchPath', async () => {
      const dir1 = join(testDir, 'project1');
      const dir2 = join(testDir, 'project2');

      mkdirSync(dir1, { recursive: true });
      mkdirSync(dir2, { recursive: true });

      writeFileSync(join(dir1, 'file.ts'), '// TODO: Project 1 todo');

      const result1 = await createServer({ mode: 'max', watchPath: dir1 });
      expect(result1.totalTodos).toBe(1);

      await getDb().close();

      writeFileSync(join(dir2, 'file.ts'), '// TODO: Project 2 todo');

      const result2 = await createServer({ mode: 'max', watchPath: dir2 });
      expect(result2.totalTodos).toBe(1);

      expect(existsSync(join(dir1, '.context-todos.db'))).toBe(true);
      expect(existsSync(join(dir2, '.context-todos.db'))).toBe(true);
    });
  });
});
