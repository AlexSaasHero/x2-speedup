import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __DEV__: 'false', __DEV_MASTER_KEY__: '""', __TARGET__: '"chrome"' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/shared/**', 'src/config/**', 'src/content/settings.ts', 'src/content/quirks.ts', 'src/content/youtube.ts'],
      reporter: ['text-summary', 'html'],
      reportsDirectory: 'coverage'
    }
  }
});
