// src/theme.ts — Shared design tokens for Kapoori Ka
// Import as: import { T, card, pill, section, primBtn } from '../theme';

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
