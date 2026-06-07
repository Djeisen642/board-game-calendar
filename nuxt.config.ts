export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',

  css: ['~/assets/global.scss'],

  app: {
    head: {
      titleTemplate: '%s - Board Game Calendar',
      title: 'Board Game Calendar',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Schedule board game nights with friends around the games you love.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
        },
      ],
    },
    pageTransition: { name: 'page', mode: 'out-in' },
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
            dark: true,
            colors: {
              background: '#11111B',
              surface: '#1E1E2E',
              'surface-variant': '#252538',
              primary: '#6C5CE7',
              'primary-darken-1': '#5A4BD1',
              secondary: '#FDCB6E',
              'secondary-darken-1': '#E0B44F',
              accent: '#00CEC9',
              info: '#74B9FF',
              warning: '#FFEAA7',
              error: '#FF7675',
              success: '#55EFC4',
              'on-background': '#CDD6F4',
              'on-surface': '#CDD6F4',
              'on-primary': '#FFFFFF',
              'on-secondary': '#11111B',
            },
          },
        },
      },
      defaults: {
        VBtn: {
          rounded: 'lg',
        },
        VCard: {
          rounded: 'xl',
        },
        VTextField: {
          variant: 'outlined',
          density: 'comfortable',
        },
        VTextarea: {
          variant: 'outlined',
          density: 'comfortable',
        },
        VAutocomplete: {
          variant: 'outlined',
          density: 'comfortable',
        },
        VProgressLinear: {
          rounded: true,
        },
      },
    },
  },

  vite: {
    optimizeDeps: {
      include: ['@vue/devtools-core', '@vue/devtools-kit', 'firebase/auth'],
    },
    define: {
      'process.env.G_API_KEY': JSON.stringify(process.env.G_API_KEY ?? ''),
      'process.env.G_APP_ID': JSON.stringify(process.env.G_APP_ID ?? ''),
    },
  },
})
