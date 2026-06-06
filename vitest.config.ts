import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  test: {
    environment: 'jsdom',
    globals: true,
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
