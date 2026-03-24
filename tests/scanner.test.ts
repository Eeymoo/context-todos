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

    describe('multiline TODOs', () => {
      it('should NOT capture continuation lines without blockComment option', async () => {
        const testFile = join(testDir, 'multiline-disabled.ts');
        writeFileSync(
          testFile,
          `/* TODO(feat): Implement render
 * - Show checkbox with completion status
 * - Show content with strikethrough
 */
`,
        );

        // Without blockComment option, should only get first line
        const todos = await scanFile(testFile);

        expect(todos.length).toBe(1);
        expect(todos[0].tag).toBe('TODO');
        expect(todos[0].category).toBe('feat');
        expect(todos[0].text).toBe('Implement render');
        expect(todos[0].text).not.toContain('Show checkbox');
      });

      it('should capture block comment TODO with continuation lines when blockComment enabled', async () => {
        const testFile = join(testDir, 'multiline.ts');
        writeFileSync(
          testFile,
          `/* TODO(feat): Implement render
 * - Show checkbox with completion status
 * - Show content with strikethrough
 */
`,
        );

        const todos = await scanFile(testFile, { blockComment: true });

        expect(todos.length).toBe(1);
        expect(todos[0].tag).toBe('TODO');
        expect(todos[0].category).toBe('feat');
        expect(todos[0].text).toContain('Implement render');
        expect(todos[0].text).toContain('Show checkbox with completion status');
        expect(todos[0].text).toContain('Show content with strikethrough');
      });

      it('should capture line comment TODO with continuation lines when blockComment enabled', async () => {
        const testFile = join(testDir, 'line-continuation.ts');
        writeFileSync(
          testFile,
          `// TODO(ux): Improve loading state
// - Add skeleton screen
// - Show progress percentage
`,
        );

        const todos = await scanFile(testFile, { blockComment: true });

        expect(todos.length).toBe(1);
        expect(todos[0].tag).toBe('TODO');
        expect(todos[0].category).toBe('ux');
        expect(todos[0].text).toContain('Improve loading state');
        expect(todos[0].text).toContain('Add skeleton screen');
        expect(todos[0].text).toContain('Show progress percentage');
      });

      it('should capture hash comment TODO with continuation lines when blockComment enabled (Python)', async () => {
        const testFile = join(testDir, 'multiline.py');
        writeFileSync(
          testFile,
          `# TODO(api): Add authentication
# - Support JWT tokens
# - Handle refresh tokens
`,
        );

        const todos = await scanFile(testFile, { blockComment: true });

        expect(todos.length).toBe(1);
        expect(todos[0].tag).toBe('TODO');
        expect(todos[0].category).toBe('api');
        expect(todos[0].text).toContain('Add authentication');
        expect(todos[0].text).toContain('Support JWT tokens');
        expect(todos[0].text).toContain('Handle refresh tokens');
      });

      it('should stop at new TODO tag when blockComment enabled', async () => {
        const testFile = join(testDir, 'multi-todo.ts');
        writeFileSync(
          testFile,
          `// TODO(feat): First todo
// - Detail 1
// - Detail 2
// TODO(feat): Second todo
// - Detail 3
`,
        );

        const todos = await scanFile(testFile, { blockComment: true });

        expect(todos.length).toBe(2);
        expect(todos[0].text).toContain('First todo');
        expect(todos[0].text).toContain('Detail 1');
        expect(todos[0].text).not.toContain('Second todo');
        expect(todos[1].text).toContain('Second todo');
        expect(todos[1].text).toContain('Detail 3');
      });

      it('should stop at block comment end when blockComment enabled', async () => {
        const testFile = join(testDir, 'block-end.ts');
        writeFileSync(
          testFile,
          `/* TODO(feat): Block todo
 * - Detail 1
 */
// TODO(other): Separate todo
`,
        );

        const todos = await scanFile(testFile, { blockComment: true });

        expect(todos.length).toBe(2);
        expect(todos[0].text).toContain('Block todo');
        expect(todos[0].text).toContain('Detail 1');
        expect(todos[0].text).not.toContain('Separate todo');
        expect(todos[1].text).toContain('Separate todo');
      });

      it('should handle single line TODO without continuation when blockComment enabled', async () => {
        const testFile = join(testDir, 'single.ts');
        writeFileSync(testFile, `// TODO: Single line todo\n`);

        const todos = await scanFile(testFile, { blockComment: true });

        expect(todos.length).toBe(1);
        expect(todos[0].text).toBe('Single line todo');
      });
    });
  });

  describe('collectFiles', () => {
    it('should collect files from directory', async () => {
      writeFileSync(join(testDir, 'file1.ts'), '');
      writeFileSync(join(testDir, 'file2.js'), '');
      writeFileSync(join(testDir, 'file3.py'), '');

      const files = await collectFiles(testDir);

      expect(files.length).toBe(3);
      expect(files.some((f) => f.endsWith('file1.ts'))).toBe(true);
      expect(files.some((f) => f.endsWith('file2.js'))).toBe(true);
      expect(files.some((f) => f.endsWith('file3.py'))).toBe(true);
    });

    it('should filter by extensions', async () => {
      writeFileSync(join(testDir, 'file1.ts'), '');
      writeFileSync(join(testDir, 'file2.js'), '');
      writeFileSync(join(testDir, 'file3.py'), '');

      const files = await collectFiles(testDir, ['.ts', '.js']);

      expect(files.length).toBe(2);
      expect(files.some((f) => f.endsWith('file1.ts'))).toBe(true);
      expect(files.some((f) => f.endsWith('file2.js'))).toBe(true);
      expect(files.some((f) => f.endsWith('file3.py'))).toBe(false);
    });

    it('should collect files recursively', async () => {
      const subDir = join(testDir, 'src');
      mkdirSync(subDir);
      writeFileSync(join(testDir, 'file1.ts'), '');
      writeFileSync(join(subDir, 'file2.ts'), '');

      const files = await collectFiles(testDir);

      expect(files.length).toBe(2);
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
