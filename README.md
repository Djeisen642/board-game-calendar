# Board Game Calendar

Schedule board game nights around the games you love — not the ones that attract the least common denominator.

## What it does

- Build your personal board game collection with ratings pulled from BoardGameGeek
- Add friends and manage friend requests
- Create and manage game night gatherings with specific games and guest lists

## Tech stack

- [Nuxt 4](https://nuxt.com) (Vue 3, static generation)
- [Vuetify 4](https://vuetifyjs.com) — Material Design 3 component library (dark theme)
- [Firebase](https://firebase.google.com) — Realtime Database, Auth, Analytics
- [Pinia](https://pinia.vuejs.org) — state management
- [Vitest](https://vitest.dev) — unit testing
- TypeScript throughout

## Getting started

```bash
# Install dependencies (Yarn required)
yarn install

# Regenerate .nuxt/ types after install
yarn postinstall

# Start dev server on port 3005
yarn dev

# Run unit tests
yarn test

# Run Firebase security rules tests (requires Java + RTDB emulator)
yarn test:rules

# Lint
yarn lint
```

## Build & deploy

```bash
# Generate static output → dist/
yarn generate
```

Deployed to GitHub Pages via GitHub Actions (`.github/workflows/cd.yml`) on push to `main`. Firebase Realtime Database security rules are also deployed automatically from `database.rules.json`.

## Data model

### Firebase paths

| Path | Description |
|------|-------------|
| `users/{uid}` | User profile |
| `users/{uid}/collection/{pushId}` | Game in user's collection |
| `users/{uid}/friends/{friendId}` | Mutual friend (value: `true`) |
| `users/{uid}/friendRequests/{fromUid}` | Incoming request (value: `'pending'`) |
| `users/{uid}/blocked/{blockedUid}` | Blocked user (value: `true`) |
| `gatherings/{pushId}` | A game night gathering |

### Types

**User** (`users/{uid}`)
- `name: string`
- `email: string`
- `phoneNumber: string`
- `address: string`
- `maxPeople: number`
- `queryableName: string` — lowercase name, indexed for friend search
- `queryableEmail: string` — lowercase email, indexed for friend search
- `queryablePhone: string` — digits-only phone, indexed for friend search

**Game** (`users/{uid}/collection/{pushId}`)
- `id: string` — BoardGameGeek game ID
- `name: string`
- `rating?: number`

**Gathering** (`gatherings/{pushId}`)
- `state: 'pending' | 'confirmed' | 'canceled'`
- `datetime: string` — ISO date
- `initiator: string` — uid
- `host: string` — uid
- `open: boolean`
- `maxGuests: number`
- `guests?: Record<string, 'invited' | 'accepted' | 'declined'>` — keyed by uid
- `games?: { id: string, name: string }[]` — denormalized from host's collection

## Project structure

```
pages/          # Route pages (Nuxt file-based routing)
components/     # Shared Vue components
stores/         # Pinia stores
helpers/        # Types, constants, route/name helpers
layouts/        # App shell (nav drawer, app bar)
assets/         # Global SCSS and Vuetify variable overrides
plugins/        # Nuxt plugins (Firebase init, auth hydration)
middleware/     # Global route middleware (auth guard)
```

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `chore:`, etc.). Husky + lint-staged enforce linting on commit.
