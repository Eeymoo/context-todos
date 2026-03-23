import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerGetTodoStats } from '../../src/mcp/tools/get-todo-stats.js';
import { initDb, getDb } from '../../src/mcp/db.js';
import { scanFile } from '../../src/mcp/scanner.js';
import { syncFileTodos } from '../../src/mcp/db.js';
import { setFormatter } from '../../src/mcp/formatter.js';

class MockMcpServer {
  tools: Map<string, { schema: unknown; handler: (args: unknown) => Promise<unknown> }> = new Map();

  registerTool(
    name: string,
    schema: unknown,
    handler: (args: unknown) => Promise<unknown>,
  ): void {
    this.tools.set(name, { schema, handler });
  }

  getTool(name: string) {
    return this.tools.get(name);
  }
}

describe('get-todo-stats tool', () => {
  let testDir: string;
  let mockServer: MockMcpServer;

  beforeEach(async () => {
    testDir = join(tmpdir(), `get-todo-stats-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    mockServer = new MockMcpServer();
    setFormatter('toon');

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

  describe('tool registration', () => {
    it('should register get-todo-stats tool with correct schema', () => {
      registerGetTodoStats(mockServer as never);

      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();
      expect(tool?.schema).toBeDefined();
    });
  });

  describe('stats when no todos exist', () => {
    it('should return "No TODOs in database" message', async () => {
      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('No TODOs in database');
    });
  });

  describe('stats with multiple todos', () => {
    it('should return total count', async () => {
      const file1 = join(testDir, 'file1.ts');
      writeFileSync(
        file1,
        `// TODO: First
// TODO: Second
`,
      );
      const todos1 = await scanFile(file1);
      await syncFileTodos('file1.ts', todos1);

      const file2 = join(testDir, 'file2.ts');
      writeFileSync(file2, '// FIXME: Third\n');
      const todos2 = await scanFile(file2);
      await syncFileTodos('file2.ts', todos2);

      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Total TODOs: 3');
    });

    it('should include breakdown by tag', async () => {
      const file = join(testDir, 'mixed.ts');
      writeFileSync(
        file,
        `// TODO: First
// TODO: Second
// FIXME: Fix this
`,
      );
      const todos = await scanFile(file);
      await syncFileTodos('mixed.ts', todos);

      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();

      const text = content![0]!.text;
      expect(text).toContain('By Tag:');
      expect(text).toContain('TODO: 2');
      expect(text).toContain('FIXME: 1');
    });

    it('should include top files by TODO count', async () => {
      const file1 = join(testDir, 'file1.ts');
      writeFileSync(
        file1,
        `// TODO: First
// TODO: Second
// TODO: Third
`,
      );
      const todos1 = await scanFile(file1);
      await syncFileTodos('file1.ts', todos1);

      const file2 = join(testDir, 'file2.ts');
      writeFileSync(file2, '// TODO: Fourth\n');
      const todos2 = await scanFile(file2);
      await syncFileTodos('file2.ts', todos2);

      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();

      const text = content![0]!.text;
      expect(text).toContain('Top Files:');
      expect(text).toContain('file1.ts: 3');
      expect(text).toContain('file2.ts: 1');
    });

    it('should sort tags by count descending', async () => {
      const file = join(testDir, 'tags.ts');
      writeFileSync(
        file,
        `// TODO: One
// TODO: Two
// TODO: Three
// FIXME: One
// FIXME: Two
`,
      );
      const todos = await scanFile(file);
      await syncFileTodos('tags.ts', todos);

      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();

      const text = content![0]!.text;
      const byTagSection = text.split('By Tag:')[1]?.split('Top Files:')[0];
      expect(byTagSection).toBeDefined();

      const lines = byTagSection!.trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain('TODO: 3');
      expect(lines[1]).toContain('FIXME: 2');
    });

    it('should sort files by count descending', async () => {
      const file1 = join(testDir, 'few.ts');
      writeFileSync(file1, '// TODO: One\n');
      const todos1 = await scanFile(file1);
      await syncFileTodos('few.ts', todos1);

      const file2 = join(testDir, 'many.ts');
      writeFileSync(
        file2,
        `// TODO: One
// TODO: Two
// TODO: Three
`,
      );
      const todos2 = await scanFile(file2);
      await syncFileTodos('many.ts', todos2);

      const file3 = join(testDir, 'some.ts');
      writeFileSync(file3, '// TODO: One\n// TODO: Two\n');
      const todos3 = await scanFile(file3);
      await syncFileTodos('some.ts', todos3);

      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();

      const text = content![0]!.text;
      const topFilesSection = text.split('Top Files:')[1];
      expect(topFilesSection).toBeDefined();

      const lines = topFilesSection!.trim().split('\n');
      expect(lines[0]).toContain('many.ts: 3');
      expect(lines[1]).toContain('some.ts: 2');
      expect(lines[2]).toContain('few.ts: 1');
    });

    it('should limit top files to 20', async () => {
      for (let i = 1; i <= 25; i++) {
        const file = join(testDir, `file${i}.ts`);
        writeFileSync(file, '// TODO: Test\n');
        const todos = await scanFile(file);
        await syncFileTodos(`file${i}.ts`, todos);
      }

      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();

      const text = content![0]!.text;
      const topFilesSection = text.split('Top Files:')[1];
      expect(topFilesSection).toBeDefined();

      const lines = topFilesSection!.trim().split('\n');
      expect(lines.length).toBeLessThanOrEqual(20);
    });
  });

  describe('output format verification', () => {
    it('should have correct structure with all sections', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: Test\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();

      const text = content![0]!.text;
      expect(text).toMatch(/^Total TODOs: \d+/);
      expect(text).toContain('\n\nBy Tag:\n');
      expect(text).toContain('\n\nTop Files:\n');
    });

    it('should format tag lines correctly', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: Test\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();

      const text = content![0]!.text;
      expect(text).toMatch(/  \w+: \d+/);
    });

    it('should format file lines correctly', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(file, '// TODO: Test\n');
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();

      const text = content![0]!.text;
      expect(text).toMatch(/  [\w./]+: \d+/);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      registerGetTodoStats(mockServer as never);
      const tool = mockServer.getTool('get-todo-stats');
      expect(tool).toBeDefined();

      const db = getDb();
      await db.close();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Error getting TODO stats');
    });
  });
});
