import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Security-rules tests run against the RTDB emulator via `yarn test:rules`;
// they are excluded from the default `yarn test` run (see vitest.config.ts)
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/rules/**/*.spec.ts'],
    // a single emulator instance backs all cases; avoid parallel clearing
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '~/': fileURLToPath(new URL('./', import.meta.url)),
      '@/': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
