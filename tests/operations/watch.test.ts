import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { watchStartOperation } from '../../src/mcp/operations/watch.js';

describe('watchStartOperation', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `watch-op-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('basic functionality', () => {
    it('should return success when starting watcher on valid directory', async () => {
      const result = await watchStartOperation({ path: testDir });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.watching).toBe(true);
        expect(result.data.path).toBe(testDir);
      }
    });

    it('should use current directory when path is not provided', async () => {
      const result = await watchStartOperation({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.watching).toBe(true);
        expect(result.data.path).toBeDefined();
      }
    });

    it('should accept extensions filter', async () => {
      const result = await watchStartOperation({
        path: testDir,
        extensions: ['.ts', '.js'],
      });

      expect(result.success).toBe(true);
    });

    it('should resolve path to absolute path', async () => {
      const result = await watchStartOperation({ path: testDir });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.path).toBe(testDir);
      }
    });
  });

  describe('input options', () => {
    it('should accept empty options', async () => {
      const result = await watchStartOperation({});

      expect(result.success).toBe(true);
    });

    it('should accept gitignoreFilter option', async () => {
      const mockGitignoreFilter = {
        ignores: () => false,
        ignoresDir: () => false,
      };

      const result = await watchStartOperation({
        path: testDir,
        gitignoreFilter: mockGitignoreFilter,
      });

      expect(result.success).toBe(true);
    });

    it('should accept scanOptions option', async () => {
      const result = await watchStartOperation({
        path: testDir,
        scanOptions: { blockComment: true },
      });

      expect(result.success).toBe(true);
    });
  });
});
