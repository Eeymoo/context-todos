import ignore from 'ignore';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

export interface GitignoreFilter {
  ignores(pathname: string): boolean;
  ignoresDir(dirPath: string): boolean;
}

const noopFilter: GitignoreFilter = {
  ignores: () => false,
  ignoresDir: () => false,
};

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
    ignores: (pathname: string) => ig.ignores(pathname),
    ignoresDir: (dirPath: string) => ig.ignores(dirPath) || ig.ignores(dirPath + '/'),
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
  const absoluteGitignorePath = resolve(rootDir, gitignorePath);

  if (!existsSync(absoluteGitignorePath)) {
    return noopFilter;
  }

  const gitignoreContent = readFileSync(absoluteGitignorePath, 'utf8');
  const ig = ignore().add(gitignoreContent);

  return {
    ignores: (pathname: string) => {
      const relativePath = relative(rootDir, pathname);
      if (!relativePath || relativePath.startsWith('..')) {
        return false;
      }
      return ig.ignores(relativePath);
    },
    ignoresDir: (dirPath: string) => {
      const relativePath = relative(rootDir, dirPath);
      if (!relativePath || relativePath.startsWith('..')) {
        return false;
      }
      return ig.ignores(relativePath) || ig.ignores(relativePath + '/');
    },
  };
}
