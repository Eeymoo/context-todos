import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanFile, collectFiles, isExtensionSupported } from '../src/mcp/scanner.js';

describe('Scanner Module', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `scanner-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('isExtensionSupported', () => {
    it('should return true for supported extensions', () => {
      expect(isExtensionSupported('.ts')).toBe(true);
      expect(isExtensionSupported('.js')).toBe(true);
      expect(isExtensionSupported('.py')).toBe(true);
    });

    it('should return false for unsupported extensions', () => {
      expect(isExtensionSupported('.xyz')).toBe(false);
      expect(isExtensionSupported('.unknown')).toBe(false);
    });
  });

  describe('scanFile', () => {
    it('should scan a TypeScript file and return TODOs', async () => {
      const testFile = join(testDir, 'test.ts');
      writeFileSync(
        testFile,
        `// TODO: This is a test todo
// FIXME: Fix this later
const x = 1;
`,
      );

      const todos = await scanFile(testFile);

      expect(todos.length).toBeGreaterThanOrEqual(2);
      expect(todos.some((t) => t.tag === 'TODO')).toBe(true);
      expect(todos.some((t) => t.tag === 'FIXME')).toBe(true);
    });

    it('should return empty array for files with no TODOs', async () => {
      const testFile = join(testDir, 'clean.ts');
      writeFileSync(testFile, 'const x = 1;\n');

      const todos = await scanFile(testFile);

      expect(todos).toEqual([]);
    });

    it('should return empty array for unsupported extensions', async () => {
      const testFile = join(testDir, 'test.xyz');
      writeFileSync(testFile, '// TODO: test\n');

      const todos = await scanFile(testFile);

      expect(todos).toEqual([]);
    });
  });

  describe('collectFiles', () => {
    it('should collect files from directory', () => {
      writeFileSync(join(testDir, 'file1.ts'), '');
      writeFileSync(join(testDir, 'file2.js'), '');
      writeFileSync(join(testDir, 'file3.py'), '');

      const files = collectFiles(testDir);

      expect(files.length).toBe(3);
      expect(files.some((f) => f.endsWith('file1.ts'))).toBe(true);
      expect(files.some((f) => f.endsWith('file2.js'))).toBe(true);
      expect(files.some((f) => f.endsWith('file3.py'))).toBe(true);
    });

    it('should filter by extensions', () => {
      writeFileSync(join(testDir, 'file1.ts'), '');
      writeFileSync(join(testDir, 'file2.js'), '');
      writeFileSync(join(testDir, 'file3.py'), '');

      const files = collectFiles(testDir, ['.ts', '.js']);

      expect(files.length).toBe(2);
      expect(files.some((f) => f.endsWith('file1.ts'))).toBe(true);
      expect(files.some((f) => f.endsWith('file2.js'))).toBe(true);
      expect(files.some((f) => f.endsWith('file3.py'))).toBe(false);
    });

    it('should ignore node_modules and .git', () => {
      mkdirSync(join(testDir, 'node_modules'));
      mkdirSync(join(testDir, '.git'));
      writeFileSync(join(testDir, 'file1.ts'), '');
      writeFileSync(join(testDir, 'node_modules', 'file2.ts'), '');
      writeFileSync(join(testDir, '.git', 'file3.ts'), '');

      const files = collectFiles(testDir);

      expect(files.length).toBe(1);
      expect(files[0]).toBeDefined();
      expect(files[0]!.endsWith('file1.ts')).toBe(true);
    });
  });
});

describe('i18n Removal Verification', () => {
  it('should have no i18n imports in scanner.ts', async () => {
    const scannerContent = await import('fs').then((fs) =>
      fs.readFileSync('./src/mcp/scanner.ts', 'utf-8'),
    );
    expect(scannerContent).not.toContain("from '../../i18n");
    expect(scannerContent).not.toContain("from './i18n");
  });

    it('should have no i18n imports in tools', async () => {
    const fs = await import('fs');
    const toolFiles = fs.readdirSync('./src/mcp/tools') as string[];

    for (const file of toolFiles) {
      if (file.endsWith('.ts')) {
        const content = fs.readFileSync(`./src/mcp/tools/${file}`, 'utf-8');
        expect(content).not.toContain("from '../../i18n");
      }
    }
  });
});
