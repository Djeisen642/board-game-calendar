import { defineConfig, configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  test: {
    environment: 'jsdom',
    globals: true,
    // rules tests need the RTDB emulator — run them via `yarn test:rules`
    exclude: [...configDefaults.exclude, 'test/rules/**'],
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
  },
  resolve: {
    alias: {
      '~/': fileURLToPath(new URL('./', import.meta.url)),
      '@/': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
