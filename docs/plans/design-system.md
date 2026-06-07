# Design System Plan

## Goal

Transform the Board Game Calendar from a bare-bones Vuetify dark theme into a polished, modern UI with a curated color palette, refined typography, subtle animations, and consistent component styling — all within Vuetify 4 + SCSS.

## Approach

### 1. Color Palette (Vuetify theme in `nuxt.config.ts`)

Replace the generic primary/secondary colors with a curated board-game-inspired palette:

- **Primary**: Deep Indigo `#6C5CE7` — premium, modern feel
- **Secondary**: Warm Amber `#FDCB6E` — complements indigo, evokes game pieces
- **Surface**: Dark elevated surface `#1E1E2E` — softer than pure black
- **Background**: Deep dark `#11111B` — cinematic depth
- **Accent**: Teal `#00CEC9` — vibrant call-to-action contrast
- **Error / Warning / Success / Info**: Refined tones (not plain red/green)

### 2. Typography (`assets/variables.scss`)

- Import Google Font **Inter** (via `<link>` in nuxt head config)
- Set Vuetify's `$body-font-family` to `'Inter', sans-serif`
- Refine heading weights and letter-spacing

### 3. Global SCSS (`assets/global.scss`)

- Smooth scrollbar styling
- Subtle glassmorphism on cards (`backdrop-filter: blur`)
- Page-enter transitions
- Refined spacing utilities
- Custom scrollbar
- Gradient accents on app-bar

### 4. Layout Enhancements (`layouts/default.vue`)

- Gradient app-bar background
- Navigation drawer: active-item highlight, smooth transitions, styled logo area
- Footer: subtle, minimal

### 5. Component Refinements

- **BGCLogo.vue**: Gradient glow effect, smoother animation
- **Snackbar.vue**: Use error/success coloring, icon indicators
- **GameSearch.vue**: Card-style search results, hover effects

### 6. Page Enhancements

- **index.vue**: Hero section with gradient background, animated CTA
- **signin.vue**: Social buttons with brand colors, divider styling
- **profile.vue**: Avatar area, field grouping
- **gamecollection.vue**: Game cards with hover lift, rating stars colored
- **friends.vue**: Avatar placeholders, search refinement
- **calendar.vue**: Empty-state illustration

### 7. Error Page

- Styled 404 with brand colors and illustration

## Files Modified

1. `nuxt.config.ts` — theme colors + font link
2. `assets/variables.scss` — Vuetify variable overrides
3. `assets/global.scss` — new global styles
4. `layouts/default.vue` — layout polish
5. `components/BGCLogo.vue` — logo animation upgrade
6. `components/Snackbar.vue` — contextual colors
7. `pages/index.vue` — hero section
8. `pages/signin.vue` — social button styling
9. `pages/profile.vue` — field layout
10. `pages/gamecollection.vue` — card styling
11. `pages/friends.vue` — avatar + search
12. `pages/calendar.vue` — empty state
13. `error.vue` — brand-styled error
