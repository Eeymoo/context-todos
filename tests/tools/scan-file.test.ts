import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerScanFile } from '../../src/mcp/tools/scan-file.js';
import { setFormatter } from '../../src/mcp/formatter.js';

// Mock MCP Server for testing
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

describe('scan-file tool', () => {
  let testDir: string;
  let mockServer: MockMcpServer;

  beforeEach(() => {
    testDir = join(tmpdir(), `scan-file-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    mockServer = new MockMcpServer();
    setFormatter('toon');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('tool registration', () => {
    it('should register scan-file tool with correct schema', () => {
      registerScanFile(mockServer as never);

      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();
      expect(tool?.schema).toBeDefined();
    });
  });

  describe('scanning file with TODOs', () => {
    it('should return formatted output for file with TODOs', async () => {
      const testFile = join(testDir, 'test.ts');
      writeFileSync(
        testFile,
        `// TODO: First todo
// FIXME: Second todo
const x = 1;
`,
      );

      registerScanFile(mockServer as never);
      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testFile });
      expect(result).toBeDefined();

      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Found 2 TODO(s)');
      expect(content![0]!.text).toContain('[TODO]');
      expect(content![0]!.text).toContain('[FIXME]');
      expect(content![0]!.text).toContain('First todo');
      expect(content![0]!.text).toContain('Second todo');
    });

    it('should include line numbers in output', async () => {
      const testFile = join(testDir, 'test.ts');
      writeFileSync(
        testFile,
        `// Line 1
// TODO: Line 2 todo
// Line 3
`,
      );

      registerScanFile(mockServer as never);
      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testFile });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain(':2');
    });

    it('should include ref if present', async () => {
      const testFile = join(testDir, 'test.ts');
      writeFileSync(
        testFile,
        `// TODO(user123): Todo with reference
const x = 1;
`,
      );

      registerScanFile(mockServer as never);
      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testFile });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('(ref:');
    });
  });

  describe('scanning file without TODOs', () => {
    it('should return "No TODOs found" message', async () => {
      const testFile = join(testDir, 'test.ts');
      writeFileSync(
        testFile,
        `const x = 1;
const y = 2;
`,
      );

      registerScanFile(mockServer as never);
      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testFile });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('No TODOs found');
    });
  });

  describe('unsupported file extension', () => {
    it('should return error message for unsupported extension', async () => {
      const testFile = join(testDir, 'test.xyz');
      writeFileSync(testFile, '// TODO: This should be ignored\n');

      registerScanFile(mockServer as never);
      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testFile });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Unsupported file extension');
      expect(content![0]!.text).toContain('.xyz');
    });

    it('should return error message for file with no extension', async () => {
      const testFile = join(testDir, 'test');
      writeFileSync(testFile, '// TODO: This should be ignored\n');

      registerScanFile(mockServer as never);
      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testFile });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Unsupported file extension');
      expect(content![0]!.text).toContain('(none)');
    });
  });

  describe('error handling', () => {
    it('should handle file read errors gracefully', async () => {
      const nonExistentFile = join(testDir, 'nonexistent.ts');

      registerScanFile(mockServer as never);
      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: nonExistentFile });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Error scanning file');
    });
  });

  describe('relative path handling', () => {
    it('should resolve relative paths correctly', async () => {
      const testFile = join(testDir, 'test.ts');
      writeFileSync(
        testFile,
        `// TODO: Test relative path
`,
      );

      registerScanFile(mockServer as never);
      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testFile });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Found 1 TODO(s)');
    });
  });

  describe('multiple TODO types', () => {
    it('should detect TODO and FIXME tags', async () => {
      const testFile = join(testDir, 'test.ts');
      writeFileSync(
        testFile,
        `// TODO: Regular todo
// FIXME: Fix me
`,
      );

      registerScanFile(mockServer as never);
      const tool = mockServer.getTool('scan-file');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testFile });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Found 2 TODO(s)');
      expect(content![0]!.text).toContain('[TODO]');
      expect(content![0]!.text).toContain('[FIXME]');
    });
  });
});
