# Plugins

Nuxt plugins run before the Vue app mounts. They are loaded in filename order.

## 01-firebase.client.ts

Initializes the Firebase app and provides the following to `useNuxtApp()`:

- `$db` — Firebase Realtime Database instance
- `$auth` — Firebase Auth instance
- `$logEvent` — wrapper around Firebase Analytics `logEvent`
- `$log` — structured logger that routes through `$logEvent`

Types for these are declared in `helpers/nuxt.d.ts`.

## 02-fireauth.client.ts

Runs after `01-firebase.client.ts`. Waits for Firebase Auth to resolve the initial auth state before the app renders, ensuring `useUserStore().user` is populated on first load.
