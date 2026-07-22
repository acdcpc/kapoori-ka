// src/theme.ts — Shared design tokens for Kapoori Ka
// Central styling constants used across all screens.
// Import as: import { theme } from '../theme';

export const theme = {
  // ── Palette ──────────────────────────────────────────────────
  colors: {
    primary:       '#E8602C',   // Terracotta / clay
    gold:          '#F5A623',
    success:       '#3D8B5E',
    danger:        '#C0392B',
    surface:       '#FDF8F2',   // Warm off-white card bg
    bg:            '#F7F1EB',   // Screen background
    textPrimary:   '#1A1A2E',
    textSecondary: '#7A6E65',
    border:        '#EDE0D4',
  },

  // ── Card ─────────────────────────────────────────────────────
  card: {
    borderRadius: 16,
    backgroundColor: '#FDF8F2' as const,
    shadowColor: '#C4956A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    padding: 16,
  },

  // ── Pill Badge ───────────────────────────────────────────────
  pillBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600' as const,
  },

  // ── Section Header ───────────────────────────────────────────
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    color: '#7A6E65',
    textTransform: 'uppercase' as const,
  },

  // ── Primary Button ───────────────────────────────────────────
  primaryButton: {
    backgroundColor: '#E8602C',
    borderRadius: 28,
    paddingVertical: 14,
    width: '100%' as const,
  },

  // ── Subtle Shadow (for warm cards) ───────────────────────────
  warmShadow: {
    shadowColor: '#C4956A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Input Field ──────────────────────────────────────────────
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EDE0D4',
    backgroundColor: '#FDF8F2',
    padding: 14,
    fontSize: 15,
    color: '#1A1A2E',
  },

  // ── Outline Button ───────────────────────────────────────────
  outlineButton: {
    borderWidth: 1.5,
    borderColor: '#EDE0D4',
    borderRadius: 28,
    paddingVertical: 13,
    backgroundColor: 'transparent' as const,
  },
};

export default theme;
