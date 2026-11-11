import { describe, expect, it } from 'vitest';
import { globToRegExp, resolveRule, ruleMatches, upsertRule, validateRule, type Rule } from '../../src/shared/rules';

const rule = (type: Rule['type'], pattern: string, speed: number, id = `${type}:${pattern}`): Rule => ({ id, type, pattern, speed });
const yt = (v: string, channel?: Rule extends never ? never : { id?: string; handle?: string; name?: string }) => ({
  host: 'www.youtube.com',
  url: `https://www.youtube.com/watch?v=${v}&t=12s`,
  channel: channel ?? null
});

describe('rules', () => {
  const rules = [
    rule('domain', 'youtube.com', 1.25),
    rule('url', 'youtube.com/watch?v=abc', 1.5),
    rule('channel', '@veritasium', 2),
    rule('domain', 'music.youtube.com', 1)
  ];

  it('priority: channel > url > domain > none', () => {
    expect(resolveRule(rules, yt('abc', { handle: '@veritasium' }))?.speed).toBe(2);
    expect(resolveRule(rules, yt('abc', { handle: '@other' }))?.speed).toBe(1.5);
    expect(resolveRule(rules, yt('zzz'))?.speed).toBe(1.25);
    expect(resolveRule(rules, { host: 'vimeo.com', url: 'https://vimeo.com/1' })).toBeNull();
  });

  it('most specific domain wins', () => {
    expect(resolveRule(rules, { host: 'music.youtube.com', url: 'https://music.youtube.com/' })?.speed).toBe(1);
  });

  it('channel matches id, handle or name, case-insensitively, with or without @', () => {
    expect(ruleMatches(rule('channel', 'VERITASIUM', 2), yt('x', { handle: '@veritasium' }))).toBe(true);
    expect(ruleMatches(rule('channel', 'UC123', 2), yt('x', { id: 'UC123' }))).toBe(true);
    expect(ruleMatches(rule('channel', 'Veritasium', 2), yt('x', { name: ' veritasium ' }))).toBe(true);
    expect(ruleMatches(rule('channel', 'Veritasium', 2), yt('x'))).toBe(false);
  });

  it('URL globs ignore protocol, www and tracking params', () => {
    expect(ruleMatches(rule('url', 'udemy.com/course/*', 1.5), { host: 'www.udemy.com', url: 'https://www.udemy.com/course/js/learn?utm_source=x' })).toBe(true);
    expect(ruleMatches(rule('url', 'https://www.udemy.com/course/*', 1.5), { host: 'udemy.com', url: 'https://udemy.com/course/js' })).toBe(true);
    expect(ruleMatches(rule('url', 'udemy.com/course/*', 1.5), { host: 'udemy.com', url: 'https://udemy.com/home' })).toBe(false);
    expect(globToRegExp('a.b/*?x=1').test('a.b/zz?x=1')).toBe(true);
    expect(globToRegExp('a.b/c').test('aXb/c')).toBe(false);
  });

  it('upsert updates an existing rule instead of duplicating', () => {
    const a = upsertRule([], { type: 'domain', pattern: 'https://www.Vimeo.com/x', speed: 1.5 });
    expect(a).toHaveLength(1);
    expect(a[0].pattern).toBe('vimeo.com');
    const b = upsertRule(a, { type: 'domain', pattern: 'vimeo.com', speed: 2 });
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ id: a[0].id, speed: 2 });
  });

  it('validates stored rules', () => {
    expect(validateRule({ type: 'domain', pattern: 'x.com', speed: '1.5' })).toMatchObject({ type: 'domain', speed: 1.5 });
    expect(validateRule({ type: 'nope', pattern: 'x', speed: 1 })).toBeNull();
    expect(validateRule({ type: 'url', pattern: ' ', speed: 1 })).toBeNull();
    expect(validateRule({ type: 'url', pattern: 'x', speed: 0 })).toBeNull();
  });
});
