import { describe, it, expect } from 'vitest';
import { createCustomFilter, combineFilters, createGitignoreFilter } from '../src/mcp/gitignore.js';

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
  });
});
