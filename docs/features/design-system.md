# Design System

A curated design system built on top of Vuetify 4's Material Design 3, giving Board Game Calendar a sleek, modern, and premium dark-mode aesthetic.

## Color Palette

| Token              | Value     | Usage                                     |
| ------------------ | --------- | ----------------------------------------- |
| `background`       | `#11111B` | Page background — deep cinematic dark     |
| `surface`          | `#1E1E2E` | Card/component backgrounds                |
| `surface-variant`  | `#252538` | Elevated surfaces, avatars                |
| `primary`          | `#6C5CE7` | Buttons, active states, accents           |
| `secondary`        | `#FDCB6E` | Rating stars, warm highlights             |
| `accent`           | `#00CEC9` | CTAs, links, teal contrast                |
| `error`            | `#FF7675` | Error states, destructive actions         |
| `warning`          | `#FFEAA7` | Warning alerts                            |
| `success`          | `#55EFC4` | Success states, save confirmations        |
| `info`             | `#74B9FF` | Informational elements                    |
| `on-background`    | `#CDD6F4` | Primary text on dark backgrounds          |
| `on-surface`       | `#CDD6F4` | Text on surfaces                          |

## Typography

- **Font**: [Inter](https://fonts.google.com/specimen/Inter) (300, 400, 500, 600, 700)
- Loaded via Google Fonts `<link>` in `nuxt.config.ts`
- Set globally via `$body-font-family` and `$heading-font-family` in `assets/variables.scss`

## Key Visual Features

### Glassmorphism Cards
All `v-card` elements have:
- Semi-transparent background (`rgba(30, 30, 46, 0.7)`)
- `backdrop-filter: blur(16px) saturate(1.4)`
- Subtle indigo border glow on hover

### Gradient App Bar
The top app bar uses a `135deg` gradient from surface to a hint of primary, with a bottom border for separation.

### Navigation Drawer
- Active item highlighted with an indigo→teal gradient
- Hover states with subtle background shifts
- Rounded list items (10px radius)

### Smooth Page Transitions
Uses Nuxt's built-in `pageTransition` with custom CSS:
- Fade + slide-up on enter
- Fade + slide-down on leave

### Empty States
All pages with empty data show:
- A large, low-opacity icon
- A title and description
- An action button

### Custom Scrollbar
Thin (6px) scrollbar with indigo thumb color and transparent track.

## Files

| File                        | Role                                    |
| --------------------------- | --------------------------------------- |
| `nuxt.config.ts`            | Theme colors, font links, defaults      |
| `assets/variables.scss`     | Vuetify SCSS variable overrides          |
| `assets/global.scss`        | Global styles, animations, scrollbar     |
| `layouts/default.vue`       | App shell with gradient bar + drawer     |
| `components/BGCLogo.vue`    | Logo with pulsing glow animation         |
| `components/Snackbar.vue`   | Contextual error/success snackbar        |

## Vuetify Defaults

Component defaults are configured in `nuxt.config.ts` under `vuetifyOptions.defaults`:
- `VBtn` → `rounded: 'lg'`
- `VCard` → `rounded: 'xl'`
- `VTextField` → `variant: 'outlined'`, `density: 'comfortable'`
- `VTextarea` → `variant: 'outlined'`, `density: 'comfortable'`
- `VAutocomplete` → `variant: 'outlined'`, `density: 'comfortable'`
- `VProgressLinear` → `rounded: true`
