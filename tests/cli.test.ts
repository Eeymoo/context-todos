import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * Tests for CLI options --log and --log-filter
 *
 * TODO: implement --log option for enabling log output
 * TODO: implement --log-filter option for filtering logs by pattern
 * 
 * These tests verify that the CLI properly parses the new options.
 * The tests execute the actual built CLI and check --help output.
 */

const cliPath = join(process.cwd(), 'dist', 'index.js');

// Helper to run CLI and capture output
function runCli(args: string): string {
  try {
    return execSync(`node ${cliPath} ${args}`, { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error: unknown) {
    // Commander outputs help to stderr on error
    const err = error as { stderr?: string; stdout?: string };
    return err.stderr || err.stdout || '';
  }
}

describe('CLI --log option', () => {
  it('should show --log option in help output', () => {
    const helpOutput = runCli('mcp --help');
    
    expect(helpOutput).toContain('--log');
    expect(helpOutput.toLowerCase()).toMatch(/enable.*log|log.*output/i);
  });

  it('should accept --log flag without error', () => {
    // This test checks that --log is a recognized option
    // We use --help with --log to see if it's accepted
    const result = runCli('mcp --log --help');
    
    // Should not show "unknown option" error
    expect(result).not.toContain('unknown option');
    expect(result).toContain('--log');
  });
});

describe('CLI --log-filter option', () => {
  it('should show --log-filter option in help output', () => {
    const helpOutput = runCli('mcp --help');
    
    expect(helpOutput).toContain('--log-filter');
    expect(helpOutput).toContain('<pattern>');
  });

  it('should accept --log-filter with a value', () => {
    const result = runCli('mcp --log-filter "error:*" --help');
    
    // Should not show "unknown option" error
    expect(result).not.toContain('unknown option');
  });
});

describe('CLI --log and --log-filter combined', () => {
  it('should accept both --log and --log-filter together', () => {
    const result = runCli('mcp --log --log-filter "info:*" --help');
    
    expect(result).not.toContain('unknown option');
    expect(result).toContain('--log');
    expect(result).toContain('--log-filter');
  });

  it('should work with other existing options', () => {
    const result = runCli('mcp --max --log --log-filter "db:*" --help');
    
    expect(result).not.toContain('unknown option');
    expect(result).toContain('--max');
    expect(result).toContain('--log');
    expect(result).toContain('--log-filter');
  });
});

describe('Help output completeness', () => {
  it('should show all expected options in mcp subcommand help', () => {
    const helpOutput = runCli('mcp --help');
    
    // Existing options that should still be present
    expect(helpOutput).toContain('--port');
    expect(helpOutput).toContain('--watch');
    expect(helpOutput).toContain('--max');
    expect(helpOutput).toContain('--labs');
    expect(helpOutput).toContain('--format');
    expect(helpOutput).toContain('--filter');
    
    // New options
    expect(helpOutput).toContain('--log');
    expect(helpOutput).toContain('--log-filter');
  });
});
