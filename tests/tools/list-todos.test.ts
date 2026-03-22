import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerListTodos } from '../../src/mcp/tools/list-todos.js';
import { initDb, getDb } from '../../src/mcp/db.js';
import { scanFile } from '../../src/mcp/scanner.js';
import { syncFileTodos } from '../../src/mcp/db.js';

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

describe('list-todos tool', () => {
  let testDir: string;
  let mockServer: MockMcpServer;

  beforeEach(async () => {
    testDir = join(tmpdir(), `list-todos-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    mockServer = new MockMcpServer();
    
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

  describe('tool registration', () => {
    it('should register list-todos tool with correct schema', () => {
      registerListTodos(mockServer as never);

      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();
      expect(tool?.schema).toBeDefined();
    });
  });

  describe('listing todos with no filters', () => {
    it('should return all todos from database', async () => {
      const file1 = join(testDir, 'file1.ts');
      writeFileSync(file1, '// TODO: First todo\n');
      const todos1 = await scanFile(file1);
      await syncFileTodos('file1.ts', todos1);

      const file2 = join(testDir, 'file2.ts');
      writeFileSync(file2, '// FIXME: Second todo\n');
      const todos2 = await scanFile(file2);
      await syncFileTodos('file2.ts', todos2);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Showing 2 of 2 TODO(s)');
      expect(content![0]!.text).toContain('[TODO]');
      expect(content![0]!.text).toContain('[FIXME]');
    });

    it('should return message when database is empty', async () => {
      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('No TODOs found in database');
    });
  });

  describe('filtering by tag', () => {
    it('should filter todos by specific tag', async () => {
      const file = join(testDir, 'mixed.ts');
      writeFileSync(
        file,
        `// TODO: Todo item
// FIXME: Fix item
// HACK: Hack item
`,
      );
      const todos = await scanFile(file);
      await syncFileTodos('mixed.ts', todos);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ tag: 'TODO' });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Showing 1 of 1 TODO(s)');
      expect(content![0]!.text).toContain('[TODO]');
      expect(content![0]!.text).not.toContain('[FIXME]');
      expect(content![0]!.text).not.toContain('[HACK]');
    });

    it('should return no results when tag has no matches', async () => {
      const file = join(testDir, 'file.ts');
      writeFileSync(file, '// TODO: Only todo\n');
      const todos = await scanFile(file);
      await syncFileTodos('file.ts', todos);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ tag: 'XXX' });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('No TODOs found in database');
    });
  });

  describe('filtering by file', () => {
    it('should filter todos by file path (partial match)', async () => {
      const file1 = join(testDir, 'component.ts');
      writeFileSync(file1, '// TODO: Component todo\n');
      const todos1 = await scanFile(file1);
      await syncFileTodos('component.ts', todos1);

      const file2 = join(testDir, 'util.ts');
      writeFileSync(file2, '// TODO: Util todo\n');
      const todos2 = await scanFile(file2);
      await syncFileTodos('util.ts', todos2);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ file: 'component' });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Showing 1 of 1 TODO(s)');
      expect(content![0]!.text).toContain('component.ts');
      expect(content![0]!.text).not.toContain('util.ts');
    });

    it('should return no results when file has no matches', async () => {
      const file = join(testDir, 'file.ts');
      writeFileSync(file, '// TODO: Test\n');
      const todos = await scanFile(file);
      await syncFileTodos('file.ts', todos);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ file: 'nonexistent' });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('No TODOs found in database');
    });
  });

  describe('pagination with limit and offset', () => {
    it('should respect limit parameter', async () => {
      const file = join(testDir, 'many.ts');
      writeFileSync(
        file,
        `// TODO: First
// TODO: Second
// TODO: Third
// TODO: Fourth
// TODO: Fifth
`,
      );
      const todos = await scanFile(file);
      await syncFileTodos('many.ts', todos);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ limit: 3 });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Showing 3 of 5 TODO(s)');
    });

    it('should respect offset parameter', async () => {
      const file = join(testDir, 'many.ts');
      writeFileSync(
        file,
        `// TODO: First
// TODO: Second
// TODO: Third
`,
      );
      const todos = await scanFile(file);
      await syncFileTodos('many.ts', todos);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ offset: 2 });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Showing 1 of 3 TODO(s)');
    });

    it('should use default limit of 100', async () => {
      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      expect(result).toBeDefined();
    });
  });

  describe('combined filters', () => {
    it('should apply both tag and file filters', async () => {
      const file1 = join(testDir, 'component.ts');
      writeFileSync(
        file1,
        `// TODO: Component todo
// FIXME: Component fix
`,
      );
      const todos1 = await scanFile(file1);
      await syncFileTodos('component.ts', todos1);

      const file2 = join(testDir, 'util.ts');
      writeFileSync(file2, '// TODO: Util todo\n');
      const todos2 = await scanFile(file2);
      await syncFileTodos('util.ts', todos2);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ tag: 'TODO', file: 'component' });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Showing 1 of 1 TODO(s)');
      expect(content![0]!.text).toContain('[TODO]');
      expect(content![0]!.text).toContain('component.ts');
      expect(content![0]!.text).not.toContain('[FIXME]');
      expect(content![0]!.text).not.toContain('util.ts');
    });

    it('should combine all filters: tag, file, limit, offset', async () => {
      const file = join(testDir, 'test.ts');
      writeFileSync(
        file,
        `// TODO: First
// TODO: Second
// TODO: Third
// FIXME: Fix
`,
      );
      const todos = await scanFile(file);
      await syncFileTodos('test.ts', todos);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ tag: 'TODO', file: 'test', limit: 2, offset: 1 });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Showing 2 of 3 TODO(s)');
    });
  });

  describe('output format', () => {
    it('should include tag, file, line number, and text', async () => {
      const file = join(testDir, 'format.ts');
      writeFileSync(file, '// TODO: Check format\n');
      const todos = await scanFile(file);
      await syncFileTodos('format.ts', todos);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      
      const text = content![0]!.text;
      expect(text).toContain('[TODO]');
      expect(text).toContain('format.ts');
      expect(text).toMatch(/:\d+/);
      expect(text).toContain('Check format');
    });

    it('should include ref when present', async () => {
      const file = join(testDir, 'withref.ts');
      writeFileSync(file, '// TODO(user123): With reference\n');
      const todos = await scanFile(file);
      await syncFileTodos('withref.ts', todos);

      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('(ref:');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      registerListTodos(mockServer as never);
      const tool = mockServer.getTool('list-todos');
      expect(tool).toBeDefined();

      const db = getDb();
      await db.close();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Error querying TODOs');
    });
  });
});
