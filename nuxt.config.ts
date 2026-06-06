export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',

  app: {
    head: {
      titleTemplate: '%s - Board Game Calendar',
      title: 'Board Game Calendar',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
    baseURL: process.env.BASE_URL ?? '/board-game-calendar/',
  },

  modules: ['@pinia/nuxt', 'vuetify-nuxt-module', '@nuxt/eslint'],

  vuetify: {
    moduleOptions: {
      styles: { configFile: './assets/variables.scss' },
    },
    vuetifyOptions: {
      theme: {
        defaultTheme: 'dark',
        themes: {
          dark: {
            colors: {
              primary: '#1565C0',
              accent: '#424242',
              secondary: '#FF8F00',
              info: '#4DB6AC',
              warning: '#FFC107',
              error: '#FF3D00',
              success: '#69F0AE',
            },
          },
        },
      },
    },
  },

  vite: {
    define: {
      'process.env.G_API_KEY': JSON.stringify(process.env.G_API_KEY ?? ''),
      'process.env.G_APP_ID': JSON.stringify(process.env.G_APP_ID ?? ''),
    },
  },
})
