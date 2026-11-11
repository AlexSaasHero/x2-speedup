import { defineConfig } from '@playwright/test';

// Live QA against real websites (network, third-party markup that changes over time).
// Not part of CI: run on demand with `npm run qa:live`.
export default defineConfig({
  testDir: 'tests/live',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/live.json' }]]
});
