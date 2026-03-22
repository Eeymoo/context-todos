import { describe, it, expect, beforeEach } from 'vitest';
import { registerListExtensions } from '../../src/mcp/tools/list-extensions.js';

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

describe('list-supported-extensions tool', () => {
  let mockServer: MockMcpServer;

  beforeEach(() => {
    mockServer = new MockMcpServer();
  });

  describe('tool registration', () => {
    it('should register list-supported-extensions tool with correct schema', () => {
      registerListExtensions(mockServer as never);

      const tool = mockServer.getTool('list-supported-extensions');
      expect(tool).toBeDefined();
      expect(tool?.schema).toBeDefined();
    });
  });

  describe('listing supported extensions', () => {
    it('should return list of supported extensions', async () => {
      registerListExtensions(mockServer as never);
      const tool = mockServer.getTool('list-supported-extensions');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.type).toBe('text');
      expect(content![0]!.text).toContain('Supported extensions');
    });

    it('should include count of supported extensions', async () => {
      registerListExtensions(mockServer as never);
      const tool = mockServer.getTool('list-supported-extensions');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toMatch(/Supported extensions \(\d+\):/);
    });

    it('should list extensions in comma-separated format', async () => {
      registerListExtensions(mockServer as never);
      const tool = mockServer.getTool('list-supported-extensions');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      expect(content![0]!.text).toContain(',');
    });

    it('should include common programming language extensions', async () => {
      registerListExtensions(mockServer as never);
      const tool = mockServer.getTool('list-supported-extensions');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      
      const text = content![0]!.text;
      expect(text).toContain('.ts');
      expect(text).toContain('.js');
      expect(text).toContain('.py');
    });

    it('should only include actually supported extensions', async () => {
      registerListExtensions(mockServer as never);
      const tool = mockServer.getTool('list-supported-extensions');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      
      const text = content![0]!.text;
      const extensions = text.split('\n')[1];
      expect(extensions).toBeDefined();
      
      const extList = extensions!.split(', ');
      expect(extList.length).toBeGreaterThan(0);
      extList.forEach(ext => {
        expect(ext).toMatch(/^\.\w+$/);
      });
    });

    it('should filter out unsupported extensions from candidates', async () => {
      registerListExtensions(mockServer as never);
      const tool = mockServer.getTool('list-supported-extensions');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      
      const text = content![0]!.text;
      expect(text).not.toContain('.xyz');
      expect(text).not.toContain('.unsupported');
    });
  });

  describe('output format', () => {
    it('should have consistent output format', async () => {
      registerListExtensions(mockServer as never);
      const tool = mockServer.getTool('list-supported-extensions');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      
      const text = content![0]!.text;
      const lines = text.split('\n');
      expect(lines.length).toBe(2);
      expect(lines[0]).toMatch(/^Supported extensions \(\d+\):$/);
      expect(lines[1]).toMatch(/^\.\w+/);
    });

    it('should return non-empty list', async () => {
      registerListExtensions(mockServer as never);
      const tool = mockServer.getTool('list-supported-extensions');
      expect(tool).toBeDefined();

      const result = await tool!.handler({});
      const content = (result as { content: { type: string; text: string }[] }).content;
      expect(content).toBeDefined();
      
      const text = content![0]!.text;
      const countMatch = text.match(/\((\d+)\)/);
      expect(countMatch).toBeDefined();
      const count = parseInt(countMatch![1]!, 10);
      expect(count).toBeGreaterThan(0);
    });
  });
});
