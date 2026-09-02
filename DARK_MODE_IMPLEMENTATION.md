# Dark Mode Implementation — Kapoori Ka

Branch: `feat/dark-mode` · Built 2026-09-02

## How it works

- `src/theme.ts` — `Palette` type with semantic color roles; `LIGHT` (original
  parchment values, pixel-identical) and `DARK` (warm charcoal `#171310` /
  `#241C18` surfaces, constant terracotta `#E8602C` accents). `makePalette(dark)`.
- `src/context/ThemeContext.ts` — context only (mirrors `LanguageContext`).
  State lives in `App.tsx`: `mode: 'system' | 'light' | 'dark'`, persisted as
  `user_theme_mode` in AsyncStorage, resolved with `useColorScheme()` for
  `system`, provided as `{ mode, setMode, isDark, palette }`.
- `app.config.js` — `userInterfaceStyle: "automatic"` so the OS setting flows
  through when mode = system.
- `App.tsx` — `ThemeContext.Provider` inside `LanguageContext.Provider`;
  `NavigationContainer` theme, native-stack header colors, `StatusBar`
  (`style={isDark ? 'light' : 'dark'}`) and both loaders follow the palette.
- `PreferencesScreen` — new **रूप / Appearance** section: system / light / dark
  radio row (same pattern as text-size), bilingual labels.
- Every screen/component builds styles through `makeStyles(palette)` and reads
  the palette via `useContext(ThemeContext)`. Module-scope color data
  (onboarding steps, nutrition age groups, immunization status pills,
  milestone domain colors, ScrollPicker styles) converted to factories.
- Printable **PDF/HTML exports stay light** on purpose (clinic hand-off
  documents are printed/shared).

## Light mode is unchanged

`LIGHT` reproduces every original hex exactly (including secondary shades like
`#4A2B20` title ink, `#6D5A52` muted text, `#FCECE2` action cards). Verified by
role-by-role mapping during conversion.

## Intentional non-themed literals

WhatsApp green `#25D366`, Google brand `#EA4335`/`#DB4437`/blues, category
accents `#2196F3`/`#673AB7`/`#8E24AA`, star `#FFD700`, black shadows — brand
or category colors that read correctly on both themes.

## Changing colors going forward

Edit the role values in `LIGHT`/`DARK` in `src/theme.ts` only — the whole app
follows. To add a role: add it to `Palette`, both palettes, then use
`t.<role>` (or `pal.<role>` in the seven screens that also use the i18n `t`).

## Validation

- `tsc --noEmit` → 0 errors
- `expo-doctor` → 21/21
- `validate:caregiver-features` + `validate:release-security` → passed
- `pnpm build:web` → exported
- Patch deps realigned (expo 57.0.19, RN 0.86.3)
