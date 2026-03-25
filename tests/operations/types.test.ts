import { describe, it, expect } from 'vitest';
import type {
  OperationResult,
  OperationConfig,
  ScanFileResult,
  ScanDirectoryResult,
  ListExtensionsResult,
} from '../../src/mcp/operations/types.js';

// TODO(test): Test OperationResult success type
describe('OperationResult type', () => {
  it('should allow success result with data', () => {
    const result: OperationResult<string> = { success: true, data: 'test' };
    expect(result.success).toBe(true);
    expect(result.data).toBe('test');
  });

  it('should allow error result with error message', () => {
    const result: OperationResult<string> = { success: false, error: 'failed' };
    expect(result.success).toBe(false);
    expect(result.error).toBe('failed');
  });
});

// TODO(test): Test OperationConfig defaults
describe('OperationConfig type', () => {
  it('should accept blockComment option', () => {
    const config: OperationConfig = { blockComment: true };
    expect(config.blockComment).toBe(true);
  });

  it('should accept format option', () => {
    const config: OperationConfig = { format: 'json' };
    expect(config.format).toBe('json');
  });
});

// TODO(test): Test ScanFileResult structure
describe('ScanFileResult type', () => {
  it('should have todos array and filePath', () => {
    const result: ScanFileResult = {
      todos: [],
      filePath: '/test.ts',
    };
    expect(result.todos).toEqual([]);
    expect(result.filePath).toBe('/test.ts');
  });
});

// TODO(test): Test ScanDirectoryResult structure
describe('ScanDirectoryResult type', () => {
  it('should have todos array, directoryPath, and fileCount', () => {
    const result: ScanDirectoryResult = {
      todos: [],
      directoryPath: '/test',
      fileCount: 0,
    };
    expect(result.todos).toEqual([]);
    expect(result.directoryPath).toBe('/test');
    expect(result.fileCount).toBe(0);
  });
});

// TODO(test): Test ListExtensionsResult structure
describe('ListExtensionsResult type', () => {
  it('should have extensions array and count', () => {
    const result: ListExtensionsResult = {
      extensions: ['.ts', '.js'],
      count: 2,
    };
    expect(result.extensions).toEqual(['.ts', '.js']);
    expect(result.count).toBe(2);
  });
});
