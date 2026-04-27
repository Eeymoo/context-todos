import ignore from 'ignore';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve, relative } from 'node:path';

export interface GitignoreFilter {
  ignores(pathname: string): boolean;
  ignoresDir(dirPath: string): boolean;
}

const noopFilter: GitignoreFilter = {
  ignores: () => false,
  ignoresDir: () => false,
};

function normalizePath(pathname: string): string | null {
  const normalized = pathname.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized === '' || normalized.startsWith('..') ? null : normalized;
}

/*
 * Creates a custom filter from comma-separated patterns.
 * Reuses ignore() library for pattern matching consistency.
 * Example: createCustomFilter("*.test.ts,__tests__/**,dist/**")
 */
export function createCustomFilter(patterns: string): GitignoreFilter {
  const patternList = patterns
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (patternList.length === 0) {
    return noopFilter;
  }

  const ig = ignore().add(patternList);

  return {
    ignores: (pathname: string) => {
      const normalized = normalizePath(pathname);
      return normalized ? ig.ignores(normalized) : false;
    },
    ignoresDir: (dirPath: string) => {
      const normalized = normalizePath(dirPath);
      return normalized ? ig.ignores(normalized) || ig.ignores(normalized + '/') : false;
    },
  };
}

/*
 * Combines multiple GitignoreFilter into one.
 * A path is ignored if ANY of the filters ignores it.
 */
export function combineFilters(
  ...filters: (GitignoreFilter | null | undefined)[]
): GitignoreFilter {
  const validFilters = filters.filter((f): f is GitignoreFilter => f != null);

  if (validFilters.length === 0) {
    return noopFilter;
  }

  if (validFilters.length === 1) {
    return validFilters[0]!;
  }

  return {
    ignores: (pathname: string) => validFilters.some((f) => f.ignores(pathname)),
    ignoresDir: (dirPath: string) => validFilters.some((f) => f.ignoresDir(dirPath)),
  };
}
export function createGitignoreFilter(
  rootDir: string,
  gitignorePath: string = '.gitignore'
): GitignoreFilter {
  const absoluteRootDir = resolve(rootDir);
  const absoluteGitignorePath = resolve(absoluteRootDir, gitignorePath);

  if (!existsSync(absoluteGitignorePath)) {
    return noopFilter;
  }

  const gitignoreContent = readFileSync(absoluteGitignorePath, 'utf8');
  const ig = ignore().add(gitignoreContent);

  function toRelativePath(pathname: string): string | null {
    const candidate = isAbsolute(pathname) ? relative(absoluteRootDir, pathname) : pathname;
    return normalizePath(candidate);
  }

  return {
    ignores: (pathname: string) => {
      const relativePath = toRelativePath(pathname);
      if (!relativePath) return false;
      return ig.ignores(relativePath);
    },
    ignoresDir: (dirPath: string) => {
      const relativePath = toRelativePath(dirPath);
      if (!relativePath) return false;
      return ig.ignores(relativePath) || ig.ignores(relativePath + '/');
    },
  };
}
