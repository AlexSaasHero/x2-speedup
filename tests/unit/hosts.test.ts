import { describe, expect, it } from 'vitest';
import { hostMatches, isHostListed, normalizeHostPattern, parseHostList } from '../../src/shared/hosts';

describe('hosts', () => {
  it('normalises patterns', () => {
    expect(normalizeHostPattern(' https://www.YouTube.com/watch?v=1 ')).toBe('youtube.com');
    expect(normalizeHostPattern('*.example.com')).toBe('example.com');
    expect(normalizeHostPattern('localhost:8080')).toBe('localhost');
  });

  it('matches domain and subdomains only', () => {
    expect(hostMatches('docs.google.com', 'google.com')).toBe(true);
    expect(hostMatches('www.google.com', 'google.com')).toBe(true);
    expect(hostMatches('notgoogle.com', 'google.com')).toBe(false);
    expect(hostMatches('google.com', 'docs.google.com')).toBe(false);
    expect(hostMatches('google.com', '')).toBe(false);
    expect(isHostListed('m.youtube.com', ['vimeo.com', 'youtube.com'])).toBe(true);
  });

  it('parses a textarea list', () => {
    expect(parseHostList('youtube.com\n\nhttps://vimeo.com/x, youtube.com')).toEqual(['youtube.com', 'vimeo.com']);
  });
});
