// Release notes shown on the onboarding page (#whats-new). Newest first.
export interface Release {
  version: string;
  items: string[];
}

export const CHANGELOG: Release[] = [
  {
    version: '1.8',
    items: ['changelog_18_license', 'changelog_18_sync', 'changelog_18_import', 'changelog_18_languages', 'changelog_18_onboarding']
  },
  {
    version: '1.7',
    items: ['changelog_17_skip', 'changelog_17_rules', 'changelog_17_ads', 'changelog_17_hold', 'changelog_17_stats']
  },
  {
    version: '1.6',
    items: ['changelog_16_free', 'changelog_16_shortcuts', 'changelog_16_overlay', 'changelog_16_persist', 'changelog_16_privacy']
  }
];
