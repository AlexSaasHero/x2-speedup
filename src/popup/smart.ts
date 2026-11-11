// Popup "Smart" tab (Pro features) and the time-saved strip.
import { formatSpeed, planLimits, type Feature } from '../config/plans';
import { upsertRule, type ChannelInfo, type Rule } from '../shared/rules';
import { t } from '../shared/i18n';
import { formatShortcut, type Shortcut } from '../shared/shortcuts';
import { STATS_BUFFER_KEY, STATS_KEY, applyBuffer, formatDuration, summarize, validateStats } from '../shared/stats';
import type { SkipSilenceSettings } from '../shared/storage';

export interface SmartDeps {
  isPro(): boolean;
  openUpgrade(title: string): void;
  sendToTab(message: Record<string, unknown>): Promise<any>;
  currentSpeed(): number;
}

const upsell = (f: Feature) => t(`upsell_${f}`);

/** "Channel Veritasium → 2x" in the UI language. */
export function describeRuleLocalized(r: Rule): string {
  const what = t(`rule_type_${r.type}`);
  return `${what} ${r.label ?? r.pattern} → ${formatSpeed(r.speed)}`;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.userAgent);

export function mountSmart(deps: SmartDeps) {
  let skipSilence: SkipSilenceSettings | null = null;
  let rules: Rule[] = [];
  let page: { host: string; url: string; channel: ChannelInfo | null; activeRule: Rule | null } | null = null;
  let sessionSaved = 0;

  const can = (f: Feature) => planLimits(deps.isPro()).features[f];
  const gate = (f: Feature) => {
    if (can(f)) return true;
    deps.openUpgrade(upsell(f));
    return false;
  };

  const skipToggle = $<HTMLInputElement>('skipSilenceToggle');
  const adsToggle = $<HTMLInputElement>('youtubeAdsToggle');

  skipToggle?.addEventListener('change', () => {
    if (!gate('skipSilence') || !skipSilence) {
      skipToggle.checked = false;
      return;
    }
    skipSilence = { ...skipSilence, enabled: skipToggle.checked };
    chrome.storage.local.set({ skipSilence });
  });
  adsToggle?.addEventListener('change', () => {
    if (!gate('youtubeAds')) {
      adsToggle.checked = false;
      return;
    }
    chrome.storage.local.set({ youtubeAds: adsToggle.checked });
  });
  document.querySelector('[data-feature="holdToSpeed"]')?.addEventListener('click', () => gate('holdToSpeed'));
  $('statsLocked')?.addEventListener('click', () => gate('statsDetails'));

  function saveRule(type: Rule['type'], pattern: string, label?: string) {
    if (!gate('rules') || !pattern) return;
    const speed = deps.currentSpeed();
    rules = upsertRule(rules, { type, pattern, speed, ...(label ? { label } : {}) });
    chrome.storage.local.set({ rules }).then(refreshPage);
  }
  $('ruleChannelBtn')?.addEventListener('click', () => {
    const c = page?.channel;
    if (c) saveRule('channel', c.id ?? c.handle ?? c.name ?? '', c.name ?? c.handle);
  });
  $('ruleUrlBtn')?.addEventListener('click', () => page && saveRule('url', page.url));
  $('ruleDomainBtn')?.addEventListener('click', () => page && saveRule('domain', page.host));
  $('removeRuleBtn')?.addEventListener('click', () => {
    const active = page?.activeRule;
    if (!active) return;
    rules = rules.filter((r) => r.id !== active.id);
    chrome.storage.local.set({ rules }).then(refreshPage);
  });

  async function refreshPage() {
    const ctx = await deps.sendToTab({ action: 'GET_PAGE_CONTEXT' });
    page = ctx ? { host: ctx.host, url: ctx.url, channel: ctx.channel ?? null, activeRule: ctx.activeRule ?? null } : null;
    renderRules();
  }

  function renderRules() {
    const text = $('activeRuleText');
    const remove = $('removeRuleBtn');
    const channelBtn = $<HTMLButtonElement>('ruleChannelBtn');
    const urlBtn = $<HTMLButtonElement>('ruleUrlBtn');
    const domainBtn = $<HTMLButtonElement>('ruleDomainBtn');
    const active = page?.activeRule ?? null;
    if (text) {
      text.textContent = !page
        ? t('rules_open_page')
        : active
          ? t('rules_active', [describeRuleLocalized(active)])
          : can('rules')
            ? t('rules_none')
            : t('rules_free', [rules.length]);
    }
    if (remove) remove.style.display = active ? 'inline-block' : 'none';
    const c = page?.channel;
    if (channelBtn) {
      channelBtn.disabled = !c;
      channelBtn.textContent = c ? t('rule_channel_named', [(c.name ?? c.handle ?? c.id ?? '').slice(0, 18)]) : t('rule_channel');
      channelBtn.title = c ? t('rule_channel_title') : t('rule_channel_unavailable');
    }
    if (urlBtn) urlBtn.disabled = !page;
    if (domainBtn) {
      domainBtn.disabled = !page;
      domainBtn.textContent = page ? t('rule_site_named', [page.host.replace(/^www\./, '').slice(0, 18)]) : t('rule_site');
    }
    onSpeed(deps.currentSpeed());
  }

  function onSpeed(speed: number) {
    const label = $('ruleSpeedLabel');
    if (label) label.textContent = formatSpeed(speed);
  }

  function onStatus(res: any) {
    sessionSaved = Number(res?.sessionSaved) || 0;
    const s = $('statsSession');
    if (s) s.textContent = formatDuration(sessionSaved);
    const st = $('skipSilenceStatus');
    const sk = res?.skipSilence;
    if (st && sk) {
      st.textContent = sk.unavailable
        ? t('skip_silence_unavailable')
        : sk.fast
          ? t('skip_silence_fast')
          : sk.listening
            ? t('skip_silence_listening')
            : t('skip_silence_desc');
    }
    const ab = $('abState');
    if (ab) ab.textContent = res?.abLoop ? (res.abLoop.b !== undefined ? t('ab_looping') : t('ab_a_set')) : t('ab_off');
    void refreshPage();
  }

  let lastStats: unknown = null;
  async function renderStats(raw: unknown) {
    lastStats = raw;
    // Include deltas the worker has buffered but not yet written (≤ 30 s old).
    const buffer = (await chrome.storage.session.get(STATS_BUFFER_KEY).catch((): Record<string, unknown> => ({})))[STATS_BUFFER_KEY] as Parameters<typeof applyBuffer>[1];
    const sum = summarize(applyBuffer(validateStats(raw), buffer));
    const set = (id: string, v: number) => {
      const el = $(id);
      if (el) el.textContent = formatDuration(v);
    };
    set('statsWeek', sum.week);
    set('statsToday', sum.today);
    set('statsTotal', sum.total);
  }

  function renderHold(holdSpeed: number, shortcuts: Shortcut[]) {
    const hint = $('holdHint');
    const b = shortcuts.find((s) => s.action === 'hold');
    if (hint) hint.textContent = b ? t('hold_hint', [formatShortcut(b, IS_MAC), formatSpeed(holdSpeed)]) : t('hold_hint_none', [formatSpeed(holdSpeed)]);
  }

  chrome.storage.local.get(['skipSilence', 'youtubeAds', 'rules', 'holdSpeed', 'shortcuts', STATS_KEY]).then((d) => {
    skipSilence = d.skipSilence ?? null;
    rules = Array.isArray(d.rules) ? d.rules : [];
    if (skipToggle) skipToggle.checked = !!skipSilence?.enabled && can('skipSilence');
    if (adsToggle) adsToggle.checked = d.youtubeAds === true && can('youtubeAds');
    renderStats(d[STATS_KEY]);
    renderHold(Number(d.holdSpeed) || 2.5, Array.isArray(d.shortcuts) ? d.shortcuts : []);
    renderRules();
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STATS_KEY]) renderStats(changes[STATS_KEY].newValue);
    if (area === 'session' && changes[STATS_BUFFER_KEY]) renderStats(lastStats);
  });

  return {
    onStatus,
    onSpeed,
    /** Plan changed: re-evaluate toggles and lock states. */
    render() {
      if (skipToggle) skipToggle.checked = !!skipSilence?.enabled && can('skipSilence');
      renderRules();
    },
    gate
  };
}
