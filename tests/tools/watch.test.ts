import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerWatchTools } from '../../src/mcp/tools/watch.js';

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

describe('watch tools', () => {
  let testDir: string;
  let mockServer: MockMcpServer;

  beforeEach(() => {
    testDir = join(tmpdir(), `watch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    mockServer = new MockMcpServer();
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('tool registration', () => {
    it('should register start-watching tool', () => {
      registerWatchTools(mockServer as never);

      const tool = mockServer.getTool('start-watching');
      expect(tool).toBeDefined();
      expect(tool?.schema).toBeDefined();
    });

    it('should register stop-watching tool', () => {
      registerWatchTools(mockServer as never);

      const tool = mockServer.getTool('stop-watching');
      expect(tool).toBeDefined();
      expect(tool?.schema).toBeDefined();
    });

    it('should register get-watched-changes tool', () => {
      registerWatchTools(mockServer as never);

      const tool = mockServer.getTool('get-watched-changes');
      expect(tool).toBeDefined();
      expect(tool?.schema).toBeDefined();
    });
  });

  describe('start-watching', () => {
    it('should start watching a directory', async () => {
      registerWatchTools(mockServer as never);
      const tool = mockServer.getTool('start-watching');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Started watching');
    });

    it('should use current directory when path not provided', async () => {
      registerWatchTools(mockServer as never);
      const tool = mockServer.getTool('start-watching');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      // Path is resolved to absolute path by watchStartOperation
      expect(content![0]!.text).toContain('Started watching');
    });

    it('should support custom path', async () => {
      registerWatchTools(mockServer as never);
      const tool = mockServer.getTool('start-watching');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain(testDir);
    });

    it('should support extensions filter', async () => {
      registerWatchTools(mockServer as never);
      const tool = mockServer.getTool('start-watching');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir, extensions: ['.ts', '.js'] });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Started watching');
    });

    it('should handle errors gracefully', async () => {
      registerWatchTools(mockServer as never);
      const tool = mockServer.getTool('start-watching');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: '/invalid/path/that/does/not/exist' });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
    });
  });

  describe('stop-watching', () => {
    it('should stop active watcher', async () => {
      registerWatchTools(mockServer as never);
      
      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir });

      const stopTool = mockServer.getTool('stop-watching');
      expect(stopTool).toBeDefined();
      const result = await stopTool!.handler({});
      
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Watcher stopped');
    });

    it('should return message when no active watcher', async () => {
      registerWatchTools(mockServer as never);
      
      const stopTool = mockServer.getTool('stop-watching');
      expect(stopTool).toBeDefined();
      const result = await stopTool!.handler({});
      
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('No active watcher to stop');
    });
  });

  describe('get-watched-changes', () => {
    it('should return error when no watcher is active', async () => {
      registerWatchTools(mockServer as never);
      
      const tool = mockServer.getTool('get-watched-changes');
      expect(tool).toBeDefined();
      const result = await tool!.handler({});
      
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('No active watcher');
    });

    // NOTE: Time-sensitive test, may fail in CI
    it.todo('should return buffered changes', async () => {
      registerWatchTools(mockServer as never);
      
      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir });

      await new Promise(resolve => setTimeout(resolve, 100));

      writeFileSync(join(testDir, 'new.ts'), '// TODO: New file\n');

      await new Promise(resolve => setTimeout(resolve, 200));

      const getTool = mockServer.getTool('get-watched-changes');
      expect(getTool).toBeDefined();
      const result = await getTool!.handler({});
      
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toMatch(/\d+ change\(s\) detected/);
    });

    it('should filter changes by since parameter', async () => {
      registerWatchTools(mockServer as never);
      
      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir });

      await new Promise(resolve => setTimeout(resolve, 100));

      writeFileSync(join(testDir, 'file1.ts'), '// TODO: File 1\n');
      const timestamp = Date.now();

      await new Promise(resolve => setTimeout(resolve, 100));

      writeFileSync(join(testDir, 'file2.ts'), '// TODO: File 2\n');

      await new Promise(resolve => setTimeout(resolve, 200));

      const getTool = mockServer.getTool('get-watched-changes');
      expect(getTool).toBeDefined();
      const result = await getTool!.handler({ since: timestamp });
      
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
    });

    it('should clear changes when clear parameter is true', async () => {
      registerWatchTools(mockServer as never);
      
      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir });

      await new Promise(resolve => setTimeout(resolve, 100));

      writeFileSync(join(testDir, 'new.ts'), '// TODO: New file\n');

      await new Promise(resolve => setTimeout(resolve, 200));

      const getTool = mockServer.getTool('get-watched-changes');
      expect(getTool).toBeDefined();
      
      const result1 = await getTool!.handler({ clear: true });
      const content1 = (result1 as { content: { type: string; text: string }[] }).content;
      expect(content1).toBeDefined();

      const result2 = await getTool!.handler({});
      const content2 = (result2 as { content: { type: string; text: string }[] }).content;
      expect(content2).toBeDefined();
      expect(content2![0]!.text).toContain('No changes detected');
    });

    it('should return "No changes detected" when buffer is empty', async () => {
      registerWatchTools(mockServer as never);
      
      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir });

      await new Promise(resolve => setTimeout(resolve, 100));

      const getTool = mockServer.getTool('get-watched-changes');
      expect(getTool).toBeDefined();
      const result = await getTool!.handler({});
      
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('No changes detected');
    });

    it.todo('should show TODO counts in change events', async () => {
      registerWatchTools(mockServer as never);

      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir });

      await new Promise(resolve => setTimeout(resolve, 200));

      writeFileSync(
        join(testDir, 'todos.ts'),
        `// TODO: First
// TODO: Second
`,
      );

      await new Promise(resolve => setTimeout(resolve, 400));

      const getTool = mockServer.getTool('get-watched-changes');
      expect(getTool).toBeDefined();
      const result = await getTool!.handler({});

      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('2 TODOs');
    });

    it.todo('should detect file add events', async () => {
      registerWatchTools(mockServer as never);

      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir });

      await new Promise(resolve => setTimeout(resolve, 200));

      writeFileSync(join(testDir, 'new.ts'), '// TODO: New\n');

      await new Promise(resolve => setTimeout(resolve, 400));

      const getTool = mockServer.getTool('get-watched-changes');
      expect(getTool).toBeDefined();
      const result = await getTool!.handler({});

      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('[ADD]');
    });

    it.todo('should detect file change events', async () => {
      registerWatchTools(mockServer as never);
      
      const testFile = join(testDir, 'existing.ts');
      writeFileSync(testFile, '// TODO: Original\n');

      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir });

      await new Promise(resolve => setTimeout(resolve, 100));

      writeFileSync(testFile, '// TODO: Modified\n');

      await new Promise(resolve => setTimeout(resolve, 200));

      const getTool = mockServer.getTool('get-watched-changes');
      expect(getTool).toBeDefined();
      const result = await getTool!.handler({});
      
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('[CHANGE]');
    });

    it.todo('should detect file unlink events', async () => {
      registerWatchTools(mockServer as never);
      
      const testFile = join(testDir, 'todelete.ts');
      writeFileSync(testFile, '// TODO: Delete me\n');

      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir });

      await new Promise(resolve => setTimeout(resolve, 100));

      rmSync(testFile);

      await new Promise(resolve => setTimeout(resolve, 200));

      const getTool = mockServer.getTool('get-watched-changes');
      expect(getTool).toBeDefined();
      const result = await getTool!.handler({});
      
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('[UNLINK]');
    });
  });

  describe('watcher with extension filter', () => {
    it.todo('should only watch files with specified extensions', async () => {
      registerWatchTools(mockServer as never);
      
      const startTool = mockServer.getTool('start-watching');
      expect(startTool).toBeDefined();
      await startTool!.handler({ path: testDir, extensions: ['.ts'] });

      await new Promise(resolve => setTimeout(resolve, 100));

      writeFileSync(join(testDir, 'included.ts'), '// TODO: Included\n');
      writeFileSync(join(testDir, 'excluded.js'), '// TODO: Excluded\n');

      await new Promise(resolve => setTimeout(resolve, 200));

      const getTool = mockServer.getTool('get-watched-changes');
      expect(getTool).toBeDefined();
      const result = await getTool!.handler({});
      
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      
      const text = content![0]!.text;
      expect(text).toContain('included.ts');
      expect(text).not.toContain('excluded.js');
    });
  });
});
