# Board Game Calendar

Schedule board game nights around the games you love — not the ones that attract the least common denominator.

## What it does

- Build your personal board game collection with ratings pulled from BoardGameGeek
- Add friends and see who's available
- Create and manage game night gatherings with specific games and guest lists

## Tech stack

- [Nuxt 4](https://nuxt.com) (Vue 3, SSR disabled)
- [Vuetify 4](https://vuetifyjs.com) — component library and design system
- [Firebase](https://firebase.google.com) — Realtime Database, Auth, Hosting, Remote Config
- [Pinia](https://pinia.vuejs.org) — state management
- [Vitest](https://vitest.dev) — unit testing
- TypeScript throughout

## Getting started

```bash
# Install dependencies (Yarn required)
yarn install

# Start dev server on port 3005
yarn dev

# Run tests
yarn test

# Lint
yarn lint
```

## Build & deploy

```bash
# Build for production
yarn build

# Generate static output
yarn generate
```

Deployed via Firebase Hosting. See `firebase.json` for hosting config and `.firebaserc` for project aliases.

## Data model

### Types

| Type | Values |
|------|--------|
| `GatheringState` | `pending` \| `confirmed` \| `canceled` |

### Collections

**user**
- `id: uuid`
- `name: string`
- `queryableName: string` (lowercase, used for search)
- `email: string`
- `phoneNumber: string`
- `address: string`
- `maxPeople: number`
- `collection: Record<string, Game>`
- `friends: Record<uid, true>`

**Game**
- `id: number` (BoardGameGeek ID)
- `name: string`
- `rating: number`

**gathering**
- `state: GatheringState`
- `datetime: DateTime`
- `initiator: uuid`
- `host: uuid`
- `open: boolean`
- `maxGuests: number`
- `guests: Guest[]`
- `games: id[]`

## Project structure

```
pages/          # Route pages (Nuxt file-based routing)
components/     # Shared Vue components
stores/         # Pinia stores
helpers/        # Types, constants, validation helpers
layouts/        # App shell (nav drawer, app bar, footer)
assets/         # Global SCSS and Vuetify variable overrides
plugins/        # Nuxt plugins (Firebase init)
```

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org). Husky + commitlint enforce this on commit.
