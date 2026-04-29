# WAP New UX Specification

Reference file: `wap_new.html` (mirrored into `wap.html`)

## Brand Typeface
- Primary UI font: `"formular-interwell", "Segoe UI", sans-serif`
- Font weights used: 400, 500, 600 via hosted `@font-face`

## Color System
- Day mode:
  - `--bg: #f4f0f7`
  - `--surface: rgba(255, 255, 255, 0.86)`
  - `--surface-alt: rgba(255, 255, 255, 0.72)`
  - `--border: rgba(33, 13, 42, 0.16)`
  - `--text: #22122d`
  - `--muted: #685774`
  - `--primary: #210d2a`
  - `--primary-strong: #13081a`
- Night mode:
  - `--bg: #110b16`
  - `--surface: rgba(30, 20, 40, 0.92)`
  - `--surface-alt: rgba(25, 17, 34, 0.9)`
  - `--border: rgba(208, 191, 222, 0.22)`
  - `--text: #f2eaf8`
  - `--muted: #b8a6c4`
  - `--primary: #f2eaf8`
  - `--primary-strong: #ffffff`

## Visual Language
- Background: soft layered gradients over base color in day mode.
- Surfaces: semi-transparent cards/panels with subtle border and elevated soft shadow.
- Radius scale: compact (`4px` root radius baseline, 3-6px usage in controls/cards).
- Density: compact controls (`22px` height, 10px control font).
- Header: frosted/glass-like top container with blur and clear action grouping.

## Interaction
- Hover states: mild lift (`translateY(-1px)`) and stronger shadow.
- Focus states: visible outline and soft ring using primary color.
- Day/night theming should preserve identical structure and spacing across pages.

## Consistency Rule
All HTML tools in this directory must reuse these tokens and interaction patterns as the baseline UX contract.
