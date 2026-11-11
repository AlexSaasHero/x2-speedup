// Speed rules: channel > URL pattern > domain > global default.
import { hostMatches, normalizeHostPattern } from './hosts';
import { normalizeMediaUrl } from './url';

export type RuleType = 'channel' | 'url' | 'domain';
export const RULE_PRIORITY: readonly RuleType[] = ['channel', 'url', 'domain'];

export interface Rule {
  id: string;
  type: RuleType;
  /** channel: id (UC…), @handle or display name · url: glob (`*` wildcard) · domain: host */
  pattern: string;
  speed: number;
  /** Human label shown in the UI (e.g. channel display name). */
  label?: string;
}

export interface ChannelInfo {
  id?: string;
  handle?: string;
  name?: string;
}

export interface PageContext {
  host: string;
  url: string;
  channel?: ChannelInfo | null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/^@/, '');

export function globToRegExp(glob: string): RegExp {
  const escaped = glob.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^${escaped.join('.*')}$`, 'i');
}

/** URL patterns are matched against the normalised address (no protocol, no www., no tracking params). */
export function normalizeUrlPattern(pattern: string): string {
  const p = pattern.trim();
  if (!p) return '';
  if (p.includes('*')) return p.replace(/^[a-z]+:\/\//i, '').replace(/^(www|m)\./i, '');
  return normalizeMediaUrl(/^[a-z]+:\/\//i.test(p) ? p : `https://${p}`);
}

export function ruleMatches(rule: Rule, ctx: PageContext): boolean {
  switch (rule.type) {
    case 'domain':
      return hostMatches(ctx.host, rule.pattern);
    case 'url': {
      const pattern = normalizeUrlPattern(rule.pattern);
      return !!pattern && globToRegExp(pattern).test(normalizeMediaUrl(ctx.url));
    }
    case 'channel': {
      const c = ctx.channel;
      if (!c) return false;
      const p = norm(rule.pattern);
      return !!p && [c.id, c.handle, c.name].some((v) => !!v && norm(v) === p);
    }
  }
}

/** Highest-priority matching rule; among domain rules the most specific (longest) wins. */
export function resolveRule(rules: readonly Rule[], ctx: PageContext): Rule | null {
  for (const type of RULE_PRIORITY) {
    const matches = rules.filter((r) => r.type === type && ruleMatches(r, ctx));
    if (!matches.length) continue;
    if (type === 'domain') return matches.sort((a, b) => b.pattern.length - a.pattern.length)[0];
    return matches[0];
  }
  return null;
}

export function newRuleId(): string {
  return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function normalizeRulePattern(type: RuleType, pattern: string): string {
  if (type === 'domain') return normalizeHostPattern(pattern);
  if (type === 'channel') return pattern.trim();
  return pattern.trim();
}

/** Insert, or update the speed of an existing rule with the same type+pattern. */
export function upsertRule(rules: readonly Rule[], next: Omit<Rule, 'id'> & { id?: string }): Rule[] {
  const pattern = normalizeRulePattern(next.type, next.pattern);
  const same = (r: Rule) => r.type === next.type && norm(r.pattern) === norm(pattern);
  const existing = rules.find(same);
  const rule: Rule = { ...next, pattern, id: existing?.id ?? next.id ?? newRuleId() };
  return existing ? rules.map((r) => (same(r) ? rule : r)) : [...rules, rule];
}

export function validateRule(raw: unknown): Rule | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.type !== 'channel' && r.type !== 'url' && r.type !== 'domain') return null;
  if (typeof r.pattern !== 'string' || !r.pattern.trim()) return null;
  const speed = typeof r.speed === 'number' ? r.speed : parseFloat(String(r.speed));
  if (!Number.isFinite(speed) || speed <= 0) return null;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newRuleId(),
    type: r.type,
    pattern: normalizeRulePattern(r.type, r.pattern),
    speed,
    ...(typeof r.label === 'string' && r.label ? { label: r.label } : {})
  };
}

export function describeRule(r: Rule): string {
  const what = r.type === 'channel' ? `Channel ${r.label ?? r.pattern}` : r.type === 'url' ? `URL ${r.pattern}` : `Site ${r.pattern}`;
  return `${what} → ${r.speed}x`;
}
