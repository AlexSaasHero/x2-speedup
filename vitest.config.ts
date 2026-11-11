import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __DEV__: 'false', __DEV_MASTER_KEY__: '""' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node'
  }
});
