import { describe, it, expect } from 'vitest';
import { createCustomFilter, combineFilters, createGitignoreFilter } from '../src/mcp/gitignore.js';
import { collectFiles } from '../src/mcp/scanner.js';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Gitignore Module', () => {
  describe('createCustomFilter', () => {
    it('should return noop filter for empty patterns', () => {
      const filter = createCustomFilter('');
      expect(filter.ignores('test.ts')).toBe(false);
      expect(filter.ignoresDir('node_modules')).toBe(false);
    });

    it('should return noop filter for whitespace-only patterns', () => {
      const filter = createCustomFilter('   ,  ,  ');
      expect(filter.ignores('test.ts')).toBe(false);
    });

    it('should filter files matching a single pattern', () => {
      const filter = createCustomFilter('*.test.ts');
      expect(filter.ignores('foo.test.ts')).toBe(true);
      expect(filter.ignores('bar.test.ts')).toBe(true);
      expect(filter.ignores('foo.ts')).toBe(false);
    });

    it('should filter files matching multiple patterns', () => {
      const filter = createCustomFilter('*.test.ts,*.spec.ts');
      expect(filter.ignores('foo.test.ts')).toBe(true);
      expect(filter.ignores('bar.spec.ts')).toBe(true);
      expect(filter.ignores('foo.ts')).toBe(false);
    });

    it('should filter directories and files inside', () => {
      const filter = createCustomFilter('__tests__/');
      expect(filter.ignores('__tests__/foo.ts')).toBe(true);
      expect(filter.ignoresDir('__tests__')).toBe(true);
      expect(filter.ignores('src/foo.ts')).toBe(false);
    });

    it('should handle patterns with spaces', () => {
      const filter = createCustomFilter('*.test.ts , *.spec.ts , dist/**');
      expect(filter.ignores('foo.test.ts')).toBe(true);
      expect(filter.ignores('bar.spec.ts')).toBe(true);
      expect(filter.ignores('dist/bundle.js')).toBe(true);
    });
  });

  describe('combineFilters', () => {
    it('should return noop filter when no filters provided', () => {
      const filter = combineFilters();
      expect(filter.ignores('test.ts')).toBe(false);
      expect(filter.ignoresDir('node_modules')).toBe(false);
    });

    it('should return noop filter when all filters are null/undefined', () => {
      const filter = combineFilters(null, undefined, null);
      expect(filter.ignores('test.ts')).toBe(false);
    });

    it('should return single filter when only one valid filter', () => {
      const custom = createCustomFilter('*.test.ts');
      const filter = combineFilters(null, custom, undefined);
      expect(filter.ignores('foo.test.ts')).toBe(true);
      expect(filter.ignores('foo.ts')).toBe(false);
    });

    it('should combine multiple filters - path ignored if ANY filter matches', () => {
      const filter1 = createCustomFilter('*.test.ts');
      const filter2 = createCustomFilter('*.spec.ts');
      const combined = combineFilters(filter1, filter2);

      expect(combined.ignores('foo.test.ts')).toBe(true);
      expect(combined.ignores('bar.spec.ts')).toBe(true);
      expect(combined.ignores('foo.ts')).toBe(false);
    });

    it('should combine gitignore and custom filters', () => {
      const custom = createCustomFilter('*.test.ts');
      // Note: createGitignoreFilter needs a real .gitignore file
      // For this test, we'll create a mock filter
      const mockGitignore = {
        ignores: (path: string) => path === 'dist/bundle.js',
        ignoresDir: (dir: string) => dir === 'dist',
      };

      const combined = combineFilters(mockGitignore, custom);

      expect(combined.ignores('foo.test.ts')).toBe(true); // matched by custom
      expect(combined.ignores('dist/bundle.js')).toBe(true); // matched by gitignore
      expect(combined.ignores('foo.ts')).toBe(false); // matched by neither
    });

    it('should combine directory filters', () => {
      const filter1 = createCustomFilter('dist/');
      const filter2 = createCustomFilter('build/');
      const combined = combineFilters(filter1, filter2);

      expect(combined.ignores('dist/bundle.js')).toBe(true);
      expect(combined.ignores('build/output.js')).toBe(true);
      expect(combined.ignores('src/foo.ts')).toBe(false);
    });
  });

  describe('createGitignoreFilter', () => {
    it('should return noop filter when .gitignore does not exist', () => {
      const filter = createGitignoreFilter('/nonexistent/path');
      expect(filter.ignores('test.ts')).toBe(false);
      expect(filter.ignoresDir('node_modules')).toBe(false);
    });

    it('should filter paths relative to the root directory', () => {
      const testDir = join(tmpdir(), `gitignore-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      mkdirSync(testDir, { recursive: true });

      try {
        writeFileSync(join(testDir, '.gitignore'), 'ignored/\n*.gen.ts\n');
        const filter = createGitignoreFilter(testDir);

        expect(filter.ignores('ignored/file.ts')).toBe(true);
        expect(filter.ignoresDir('ignored')).toBe(true);
        expect(filter.ignores('src/generated.gen.ts')).toBe(true);
        expect(filter.ignores('src/visible.ts')).toBe(false);
      } finally {
        if (existsSync(testDir)) {
          rmSync(testDir, { recursive: true, force: true });
        }
      }
    });

    it('should filter absolute paths inside the root directory for compatibility', () => {
      const testDir = join(tmpdir(), `gitignore-absolute-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      mkdirSync(testDir, { recursive: true });

      try {
        writeFileSync(join(testDir, '.gitignore'), 'ignored/\n*.gen.ts\n');
        const filter = createGitignoreFilter(testDir);

        expect(filter.ignores(join(testDir, 'ignored', 'file.ts'))).toBe(true);
        expect(filter.ignores(join(testDir, 'src', 'generated.gen.ts'))).toBe(true);
      } finally {
        if (existsSync(testDir)) {
          rmSync(testDir, { recursive: true, force: true });
        }
      }
    });

    it('should keep ignored files out of collected scan files', async () => {
      const testDir = join(tmpdir(), `gitignore-collect-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      mkdirSync(join(testDir, 'ignored'), { recursive: true });
      mkdirSync(join(testDir, 'src'), { recursive: true });

      try {
        writeFileSync(join(testDir, '.gitignore'), 'ignored/\n*.gen.ts\n');
        writeFileSync(join(testDir, 'ignored', 'hidden.ts'), '// TODO: hidden\n');
        writeFileSync(join(testDir, 'src', 'generated.gen.ts'), '// TODO: generated\n');
        writeFileSync(join(testDir, 'src', 'visible.ts'), '// TODO: visible\n');

        const filter = createGitignoreFilter(testDir);
        const files = await collectFiles(testDir, undefined, filter);
        const relativeFiles = files.map((file) => file.replace(testDir + '/', '')).sort();

        expect(relativeFiles).toEqual(['src/visible.ts']);
      } finally {
        if (existsSync(testDir)) {
          rmSync(testDir, { recursive: true, force: true });
        }
      }
    });
  });
});
