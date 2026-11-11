import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __DEV__: 'false', __DEV_MASTER_KEY__: '""', __TARGET__: '"chrome"' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node'
  }
});
