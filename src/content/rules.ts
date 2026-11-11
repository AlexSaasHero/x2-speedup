// Applies the highest-priority matching speed rule for the current page.
import { planLimits } from '../config/plans';
import { describeRule, resolveRule, type PageContext, type Rule } from '../shared/rules';
import { t } from '../shared/i18n';
import { debug } from './log';
import type { MediaRegistry } from './media-registry';
import type { RateController } from './rate-controller';
import type { ContentSettings } from './settings';
import { extractChannel } from './youtube';

/** YouTube fills in the owner link after navigation; look again a few times (no continuous polling). */
const RETRY_DELAYS_MS = [0, 600, 1500, 3500];

export class RuleApplier {
  private appliedId: string | null = null;
  private timers: number[] = [];

  constructor(
    private readonly settings: () => ContentSettings,
    private readonly controller: RateController,
    private readonly registry: MediaRegistry,
    private readonly host: string
  ) {}

  context(): PageContext {
    return { host: this.host, url: location.href, channel: extractChannel(document, location.href) };
  }

  /** The rule that matches now (or null), regardless of whether it was applied. */
  current(): Rule | null {
    const s = this.settings();
    if (!planLimits(s.pro).features.rules || !s.rules.length) return null;
    return resolveRule(s.rules, this.context());
  }

  /** Speed for the first apply at load time (also marks the rule as applied). */
  initialSpeed(): number | null {
    const rule = this.current();
    this.appliedId = rule?.id ?? null;
    if (rule) debug('rule at load', describeRule(rule));
    return rule?.speed ?? null;
  }

  /** Re-evaluate after navigation or a settings change. */
  schedule(force = false): void {
    if (force) this.appliedId = null;
    this.timers.forEach(clearTimeout);
    this.timers = RETRY_DELAYS_MS.map((ms) => window.setTimeout(() => this.evaluate(), ms));
  }

  private evaluate(): void {
    const rule = this.current();
    if (!rule) {
      this.appliedId = null;
      return;
    }
    if (rule.id === this.appliedId || !this.registry.count()) return;
    this.appliedId = rule.id;
    debug('applying rule', describeRule(rule));
    this.controller.setSpeed(rule.speed, this.registry.all(), { persist: false, label: t('overlay_rule', [`${rule.speed}x`]) });
  }
}
