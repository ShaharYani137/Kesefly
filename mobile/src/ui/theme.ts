/**
 * Platform design tokens.
 *
 * iOS follows Apple HIG (`.claude/skills/apple-human-interface-guidelines/references/`):
 *   - typography.md, "Large (default)" Dynamic Type table: Large Title 34/41, Title 1 28/34,
 *     Title 3 20/25, Headline 17/22 semibold, Body 17/22, Subhead 15/20, Footnote 13/18, Caption 1 12/16.
 *   - accessibility.md / buttons.md: 44x44 pt minimum hit region.
 *   - color.md: system + grouped background sets. Hex values are Apple's published
 *     light/dark values for systemGroupedBackground, label, systemBlue, systemGreen, etc.
 *
 * Android follows M3 Expressive (`.claude/skills/m3-expressive/references/tokens.md`):
 *   - Type scale: Headline medium 28/36, Title large 22/28, Title medium 16/24 (Medium),
 *     Body large 16/24, Body medium 14/20, Body small 12/16, Label medium 12/16 (Medium).
 *   - Shape: Medium 12dp (cards), Full (buttons, default per shape.md), Large 16dp.
 *   - foundations.md: 48dp target size.
 *
 * DESIGN DECISIONS (not taken from the references):
 *   - Android color scheme: tonal palette generated from green seed #386A20 (finance/growth feel).
 *     Role names follow M3 (primary, primaryContainer, surfaceContainer...), values are ours.
 *   - iOS card corner radius 10pt and prominent button height 50pt.
 *   - Android primary button height 56dp (M3 Expressive "medium" button size).
 */
import { Platform, type TextStyle, useColorScheme } from 'react-native';

const isIOS = Platform.OS === 'ios';

type Colors = {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  separator: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  onAccentSoft: string;
  positive: string;
  warning: string;
  danger: string;
  fill: string;
  range: string;
};

const iosLight: Colors = {
  background: '#F2F2F7', // systemGroupedBackground
  card: '#FFFFFF', // secondarySystemGroupedBackground
  text: '#000000', // label
  textSecondary: 'rgba(60,60,67,0.6)', // secondaryLabel
  separator: 'rgba(60,60,67,0.29)', // separator
  accent: '#007AFF', // systemBlue
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(0,122,255,0.12)',
  onAccentSoft: '#007AFF',
  positive: '#34C759', // systemGreen
  warning: '#FF9500', // systemOrange
  danger: '#FF3B30', // systemRed
  fill: 'rgba(118,118,128,0.12)', // tertiarySystemFill
  range: 'rgba(52,199,89,0.28)',
};

const iosDark: Colors = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.6)',
  separator: 'rgba(84,84,88,0.65)',
  accent: '#0A84FF',
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(10,132,255,0.2)',
  onAccentSoft: '#0A84FF',
  positive: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF453A',
  fill: 'rgba(118,118,128,0.24)',
  range: 'rgba(48,209,88,0.32)',
};

// Design decision: M3 roles, values from green seed #386A20.
const mdLight: Colors = {
  background: '#F8FAF0', // surface
  card: '#ECEFE4', // surfaceContainer
  text: '#191D16', // onSurface
  textSecondary: '#43483E', // onSurfaceVariant
  separator: '#C3C8BB', // outlineVariant
  accent: '#386A20', // primary
  onAccent: '#FFFFFF', // onPrimary
  accentSoft: '#B8F397', // primaryContainer
  onAccentSoft: '#082100', // onPrimaryContainer
  positive: '#386A20',
  warning: '#7A5900',
  danger: '#BA1A1A', // error
  fill: '#E1E4D9', // surfaceContainerHighest
  range: '#B8F397',
};

const mdDark: Colors = {
  background: '#11140F',
  card: '#1D211A',
  text: '#E1E4DA',
  textSecondary: '#C3C8BB',
  separator: '#43483E',
  accent: '#9DD67D',
  onAccent: '#0C3900',
  accentSoft: '#215106',
  onAccentSoft: '#B8F397',
  positive: '#9DD67D',
  warning: '#F5BF48',
  danger: '#FFB4AB',
  fill: '#33362F',
  range: '#215106',
};

export type TypeRole = 'largeTitle' | 'title' | 'title3' | 'headline' | 'body' | 'subhead' | 'footnote' | 'caption';

const iosType: Record<TypeRole, TextStyle> = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

const mdType: Record<TypeRole, TextStyle> = {
  largeTitle: { fontSize: 28, lineHeight: 36, fontWeight: '400' }, // Headline medium
  title: { fontSize: 22, lineHeight: 28, fontWeight: '400' }, // Title large
  title3: { fontSize: 22, lineHeight: 28, fontWeight: '500' }, // Title large, emphasized
  headline: { fontSize: 16, lineHeight: 24, fontWeight: '500', letterSpacing: 0.2 }, // Title medium
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: 0.5 }, // Body large
  subhead: { fontSize: 14, lineHeight: 20, fontWeight: '400', letterSpacing: 0.2 }, // Body medium
  footnote: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0.4 }, // Body small
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 }, // Label medium
};

export const Metrics = {
  margin: 16,
  gap: isIOS ? 20 : 16,
  cardPadding: 16,
  cardRadius: isIOS ? 10 : 12,
  minTarget: isIOS ? 44 : 48,
  buttonHeight: isIOS ? 50 : 56,
  fieldHeight: isIOS ? 44 : 56,
  fieldRadius: isIOS ? 10 : 4,
};

export function useTokens() {
  const dark = useColorScheme() === 'dark';
  const colors = isIOS ? (dark ? iosDark : iosLight) : dark ? mdDark : mdLight;
  return { colors, type: isIOS ? iosType : mdType, dark, isIOS };
}
