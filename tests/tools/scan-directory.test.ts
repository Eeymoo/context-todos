import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { registerScanDirectory } from '../../src/mcp/tools/scan-directory.js';
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

describe('scan-directory tool', () => {
  let testDir: string;
  let mockServer: MockMcpServer;

  beforeEach(() => {
    testDir = join(tmpdir(), `scan-directory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    it('should register scan-directory tool with correct schema', () => {
      registerScanDirectory(mockServer as never);

      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();
      expect(tool?.schema).toBeDefined();
    });
  });

  describe('scanning directory with TODOs', () => {
    it('should return formatted output for directory with TODOs across multiple files', async () => {
      writeFileSync(
        join(testDir, 'file1.ts'),
        `// TODO: First file todo
const x = 1;
`,
      );
      writeFileSync(
        join(testDir, 'file2.ts'),
        `// FIXME: Second file todo
const y = 2;
`,
      );

      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Found 2 TODO(s) across 2 file(s)');
      expect(content![0]!.text).toContain('[TODO]');
      expect(content![0]!.text).toContain('[FIXME]');
      expect(content![0]!.text).toContain('file1.ts');
      expect(content![0]!.text).toContain('file2.ts');
    });

    it('should include relative paths in output', async () => {
      const subDir = join(testDir, 'src');
      mkdirSync(subDir, { recursive: true });

      writeFileSync(
        join(subDir, 'component.ts'),
        `// TODO: Component todo
`,
      );

      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('src/component.ts');
    });

    it('should scan nested directories recursively', async () => {
      const level1 = join(testDir, 'level1');
      const level2 = join(level1, 'level2');
      mkdirSync(level2, { recursive: true });

      writeFileSync(join(testDir, 'root.ts'), '// TODO: Root level\n');
      writeFileSync(join(level1, 'level1.ts'), '// TODO: Level 1\n');
      writeFileSync(join(level2, 'level2.ts'), '// TODO: Level 2\n');

      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Found 3 TODO(s)');
      expect(content![0]!.text).toContain('root.ts');
      expect(content![0]!.text).toContain('level1/level1.ts');
      expect(content![0]!.text).toContain('level1/level2/level2.ts');
    });
  });

  describe('scanning empty directory', () => {
    it('should return "No TODOs found" message for empty directory', async () => {
      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('No TODOs found');
    });

    it('should return "No TODOs found" for directory with files but no TODOs', async () => {
      writeFileSync(join(testDir, 'clean.ts'), 'const x = 1;\n');

      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('No TODOs found');
    });
  });

  describe('filtering by extensions', () => {
    it('should filter files by specified extensions', async () => {
      writeFileSync(join(testDir, 'file.ts'), '// TODO: TypeScript\n');
      writeFileSync(join(testDir, 'file.js'), '// TODO: JavaScript\n');
      writeFileSync(join(testDir, 'file.py'), '# TODO: Python\n');

      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir, extensions: ['.ts'] });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Found 1 TODO(s)');
      expect(content![0]!.text).toContain('file.ts');
      expect(content![0]!.text).not.toContain('file.js');
      expect(content![0]!.text).not.toContain('file.py');
    });

    it('should support multiple extension filters', async () => {
      writeFileSync(join(testDir, 'file.ts'), '// TODO: TypeScript\n');
      writeFileSync(join(testDir, 'file.js'), '// TODO: JavaScript\n');
      writeFileSync(join(testDir, 'file.py'), '# TODO: Python\n');

      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir, extensions: ['.ts', '.js'] });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Found 2 TODO(s)');
      expect(content![0]!.text).toContain('file.ts');
      expect(content![0]!.text).toContain('file.js');
      expect(content![0]!.text).not.toContain('file.py');
    });
  });

  describe('error handling', () => {
    it('should return error message when path is not a directory', async () => {
      const testFile = join(testDir, 'file.ts');
      writeFileSync(testFile, '// TODO: Test\n');

      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testFile });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Not a directory');
    });

    it('should handle scan errors gracefully', async () => {
      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: '/nonexistent/path' });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Error scanning directory');
    });
  });

  describe('default path handling', () => {
    it('should use current directory when path is omitted', async () => {
      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
    });
  });

  describe('multiple TODO types', () => {
    it('should detect all TODO tag types', async () => {
      writeFileSync(
        join(testDir, 'tags.ts'),
        `// TODO: Regular todo
// FIXME: Fix me
`,
      );

      registerScanDirectory(mockServer as never);
      const tool = mockServer.getTool('scan-directory');
      expect(tool).toBeDefined();

      const result = await tool!.handler({ path: testDir });
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain('Found 2 TODO(s)');
      expect(content![0]!.text).toContain('[TODO]');
      expect(content![0]!.text).toContain('[FIXME]');
    });
  });
});
