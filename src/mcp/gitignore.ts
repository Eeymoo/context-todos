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
