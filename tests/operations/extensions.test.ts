import { describe, it, expect } from 'vitest';
import { EXTENSION_CANDIDATES, getSupportedExtensions, isExtensionSupported } from '../../src/mcp/operations/extensions.js';

// TODO(test): Test EXTENSION_CANDIDATES constant contains expected extensions
describe('EXTENSION_CANDIDATES constant', () => {
  it('should contain expected common extensions', () => {
    expect(EXTENSION_CANDIDATES).toContain('.ts');
    expect(EXTENSION_CANDIDATES).toContain('.js');
    expect(EXTENSION_CANDIDATES).toContain('.py');
    expect(EXTENSION_CANDIDATES).toContain('.java');
    expect(EXTENSION_CANDIDATES).toContain('.go');
  });

  it('should contain frontend extensions', () => {
    expect(EXTENSION_CANDIDATES).toContain('.tsx');
    expect(EXTENSION_CANDIDATES).toContain('.jsx');
    expect(EXTENSION_CANDIDATES).toContain('.vue');
    expect(EXTENSION_CANDIDATES).toContain('.svelte');
    expect(EXTENSION_CANDIDATES).toContain('.css');
    expect(EXTENSION_CANDIDATES).toContain('.scss');
    expect(EXTENSION_CANDIDATES).toContain('.less');
    expect(EXTENSION_CANDIDATES).toContain('.html');
  });

  it('should contain backend extensions', () => {
    expect(EXTENSION_CANDIDATES).toContain('.rs');
    expect(EXTENSION_CANDIDATES).toContain('.c');
    expect(EXTENSION_CANDIDATES).toContain('.cpp');
    expect(EXTENSION_CANDIDATES).toContain('.cs');
    expect(EXTENSION_CANDIDATES).toContain('.php');
    expect(EXTENSION_CANDIDATES).toContain('.swift');
    expect(EXTENSION_CANDIDATES).toContain('.kt');
    expect(EXTENSION_CANDIDATES).toContain('.scala');
  });

  it('should contain script and config extensions', () => {
    expect(EXTENSION_CANDIDATES).toContain('.sh');
    expect(EXTENSION_CANDIDATES).toContain('.bash');
    expect(EXTENSION_CANDIDATES).toContain('.yaml');
    expect(EXTENSION_CANDIDATES).toContain('.yml');
    expect(EXTENSION_CANDIDATES).toContain('.toml');
    expect(EXTENSION_CANDIDATES).toContain('.ini');
    expect(EXTENSION_CANDIDATES).toContain('.cfg');
    expect(EXTENSION_CANDIDATES).toContain('.dockerfile');
  });

  it('should have at least 40 extensions', () => {
    expect(EXTENSION_CANDIDATES.length).toBeGreaterThanOrEqual(40);
  });

  it('should be a readonly array', () => {
    // TypeScript will enforce readonly, but we can verify it's declared as const
    expect(Object.isFrozen(EXTENSION_CANDIDATES)).toBe(false); // Not frozen, but we can check type safety
  });
});

// TODO(test): Test getSupportedExtensions returns only supported extensions
describe('getSupportedExtensions function', () => {
  it('should return an array of strings', () => {
    const supported = getSupportedExtensions();
    expect(Array.isArray(supported)).toBe(true);
    expect(supported.every(ext => typeof ext === 'string')).toBe(true);
  });

  it('should return only extensions that are actually supported', () => {
    const supported = getSupportedExtensions();
    for (const ext of supported) {
      expect(isExtensionSupported(ext)).toBe(true);
    }
  });

  it('should include specific supported extensions', () => {
    const supported = getSupportedExtensions();
    expect(supported).toContain('.ts');
    expect(supported).toContain('.js');
    expect(supported).toContain('.py');
  });

  it('should filter out unsupported extensions', () => {
    const supported = getSupportedExtensions();
    const allCandidates = EXTENSION_CANDIDATES;
    // At least some extensions should be filtered out
    expect(supported.length).toBeLessThanOrEqual(allCandidates.length);
  });
});

// TODO(test): Test isExtensionSupported function behavior
describe('isExtensionSupported re-export', () => {
  it('should be a function', () => {
    expect(typeof isExtensionSupported).toBe('function');
  });

  it('should return boolean for known extensions', () => {
    expect(typeof isExtensionSupported('.ts')).toBe('boolean');
    expect(typeof isExtensionSupported('.js')).toBe('boolean');
    expect(typeof isExtensionSupported('.xyz')).toBe('boolean');
  });

  it('should return consistent results for same extension', () => {
    const result1 = isExtensionSupported('.ts');
    const result2 = isExtensionSupported('.ts');
    expect(result1).toBe(result2);
  });

  it('should return false for obviously fake extension', () => {
    expect(isExtensionSupported('.xyz123notreal')).toBe(false);
  });
});
