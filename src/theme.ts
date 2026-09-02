// src/theme.ts — Shared design tokens for Kapoori Ka
// Import as: import { T, card, pill, section, primBtn } from '../theme';
// Dark mode: `Palette` holds every color role the app uses; LIGHT keeps the
// original warm parchment look, DARK is a warm charcoal variant with the same
// terracotta accents. Build per-render palettes with makePalette(dark) and
// read the active one from ThemeContext (useTheme()).

export type Palette = {
  clay: string;       // primary — terracotta (same in both themes)
  gold: string;       // secondary — turmeric
  green: string;      // success
  red: string;        // danger
  surface: string;    // card / sheet background
  bg: string;         // screen background
  text: string;       // primary text
  onClay: string;     // ink on terracotta fills (AA)
  onAccent: string;   // label on accent fills where light mode used white
  muted: string;      // secondary text
  border: string;
  shadow: string;
  greenLight: string; // success tint bg
  greenDark: string;  // success tint text
  redLight: string;   // danger tint bg
  redDark: string;    // danger tint text
  amberLight: string; // warning tint bg
  amberDark: string;  // warning tint text
  blue: string;       // links / Google blue
  terracotta: string; // legacy soft terracotta (Preferences accents)
  surfaceWarm: string; // warmer page variant
  bgWarm: string;      // page background variant (#FFF8F2 in light)
  titleInk: string;   // headings (#4A2B20 in light)
  muted2: string;     // secondary text variant (#6D5A52 in light)
  subInk: string;     // Nepali subtitle ink
  labelInk: string;   // form/row label ink
  actionBg: string;   // tinted action-card background
  actionTitleInk: string;
  actionTextInk: string;
  choiceBorder: string;   // choice-chip border
  switchTrackOff: string;
  switchTrackOn: string;
  infoBg: string;      // informational tint bg
  purpleLight: string; // cognitive-domain tint bg
  purpleDark: string;  // cognitive-domain tint ink
};

export const LIGHT: Palette = {
  clay: '#E8602C',
  gold: '#F5A623',
  green: '#3D8B5E',
  red: '#C0392B',
  surface: '#FDF8F2',
  bg: '#F7F1EB',
  text: '#1A1A2E',
  onClay: '#1A1A2E',
  onAccent: '#FFFFFF',
  muted: '#7A6E65',
  border: '#EDE0D4',
  shadow: '#C4956A',
  greenLight: '#D1FAE5',
  greenDark: '#065F46',
  redLight: '#FEE2E2',
  redDark: '#991B1B',
  amberLight: '#FEF3C7',
  amberDark: '#92400E',
  blue: '#1a73e8',
  terracotta: '#B85C38',
  surfaceWarm: '#FFF5F0',
  bgWarm: '#FFF8F2',
  titleInk: '#4A2B20',
  muted2: '#6D5A52',
  subInk: '#7D5140',
  labelInk: '#3D302B',
  actionBg: '#FCECE2',
  actionTitleInk: '#71381F',
  actionTextInk: '#714D3B',
  choiceBorder: '#D7BBAA',
  switchTrackOff: '#C8B9A8',
  switchTrackOn: '#D89777',
  infoBg: '#E3F2FD',
  purpleLight: '#E8E0F0',
  purpleDark: '#6B21A8',
};

// Warm charcoal — same hue family as the parchment theme, terracotta accents
// stay constant so the brand reads identically in both modes.
export const DARK: Palette = {
  clay: '#E8602C',
  gold: '#F5A623',
  green: '#5DBE8B',
  red: '#E06B5B',
  surface: '#241C18',
  bg: '#171310',
  text: '#F0E7DE',
  onClay: '#1A1A2E',
  onAccent: '#FFF7F2',
  muted: '#B5A69B',
  border: '#3E322A',
  shadow: '#000000',
  greenLight: '#173B2C',
  greenDark: '#8FE3BC',
  redLight: '#3F1D18',
  redDark: '#F5A297',
  amberLight: '#3B2F14',
  amberDark: '#F2C879',
  blue: '#8AB4F8',
  terracotta: '#D15A2F',
  surfaceWarm: '#2B211C',
  bgWarm: '#1B1512',
  titleInk: '#F5EBE1',
  muted2: '#CDB4A6',
  subInk: '#C4A99A',
  labelInk: '#E5D9CF',
  actionBg: '#2E211B',
  actionTitleInk: '#F0C9B4',
  actionTextInk: '#CDB4A6',
  choiceBorder: '#4A3A31',
  switchTrackOff: '#4A3A31',
  switchTrackOn: '#B85C38',
  infoBg: '#1B2A3A',
  purpleLight: '#2A2140',
  purpleDark: '#C9B8F0',
};

export const makePalette = (dark: boolean): Palette => (dark ? DARK : LIGHT);

export const T = {
  clay: '#E8602C',       // primary — terracotta
  gold: '#F5A623',       // secondary — turmeric
  green: '#3D8B5E',      // success — mountain pine
  red: '#C0392B',        // danger — missed/due
  surface: '#FDF8F2',    // warm off-white card bg
  bg: '#F7F1EB',         // parchment screen bg
  text: '#1A1A2E',       // near-black
  onClay: '#1A1A2E',    // dark ink on terracotta — 4.99:1 (AA). White on clay is only 3.42:1 (fails AA for normal text).
  muted: '#7A6E65',      // warm gray
  border: '#EDE0D4',     // subtle border
  shadow: '#C4956A',     // warm shadow color
  greenLight: '#D1FAE5',
  greenDark: '#065F46',
  redLight: '#FEE2E2',
  redDark: '#991B1B',
  amberLight: '#FEF3C7',
  amberDark: '#92400E',
};

export const card = {
  backgroundColor: T.surface,
  borderRadius: 16,
  padding: 16,
  shadowColor: T.shadow,
  shadowOpacity: 0.10,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
  marginBottom: 10,
};

export const pill = (bg: string, color: string) => ({
  borderRadius: 20,
  paddingHorizontal: 10,
  paddingVertical: 4,
  backgroundColor: bg,
  color,
  alignSelf: 'flex-start' as const,
});

export const section = {
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 1.2,
  color: T.muted,
  textTransform: 'uppercase' as const,
  marginBottom: 10,
  marginTop: 16,
};

export const primBtn = {
  backgroundColor: T.clay,
  borderRadius: 28,
  paddingVertical: 14,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

// ── Backward compatibility exports ────────────────────────────
export const theme = {
  colors: {
    primary: T.clay,
    gold: T.gold,
    success: T.green,
    danger: T.red,
    surface: T.surface,
    bg: T.bg,
    textPrimary: T.text,
    textSecondary: T.muted,
    border: T.border,
  },
  card: {
    borderRadius: 16,
    backgroundColor: T.surface as string,
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    padding: 16,
  },
  pillBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    color: T.muted,
    textTransform: 'uppercase' as const,
  },
  primaryButton: {
    backgroundColor: T.clay,
    borderRadius: 28,
    paddingVertical: 14,
    width: '100%' as const,
  },
  warmShadow: {
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
    padding: 14,
    fontSize: 15,
    color: T.text,
  },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 28,
    paddingVertical: 13,
    backgroundColor: 'transparent' as const,
  },
};

export default theme;
