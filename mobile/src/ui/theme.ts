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
 *   - Brand v2 colors and the Rubik typeface (see the color and Fonts blocks below).
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
  gold: string;
  /** Dark brand surface for hero cards (portfolio, market clocks). */
  hero: string;
  onHero: string;
};

// DESIGN DECISION (brand v2, 2026-11-14): brand teal #0F7B6C, midnight #062A26, gold #F5C542.
// iOS keeps Apple's system background, label and separator colors (color.md) and uses the
// brand teal as the app tint (HIG allows one custom key color). Positive/negative stay distinct
// from the tint: green for gains, red for losses.
const iosLight: Colors = {
  background: '#F2F2F7', // systemGroupedBackground
  card: '#FFFFFF', // secondarySystemGroupedBackground
  text: '#000000', // label
  textSecondary: 'rgba(60,60,67,0.6)', // secondaryLabel
  separator: 'rgba(60,60,67,0.29)', // separator
  accent: '#0F7B6C', // brand tint
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(15,123,108,0.12)',
  onAccentSoft: '#0B5E53',
  positive: '#248A3D', // accessible systemGreen (dark text variant)
  warning: '#C93400', // accessible systemOrange
  danger: '#D70015', // accessible systemRed
  fill: 'rgba(118,118,128,0.12)', // tertiarySystemFill
  range: 'rgba(15,123,108,0.22)',
  gold: '#B8860B',
  hero: '#062A26',
  onHero: '#FFFFFF',
};

const iosDark: Colors = {
  background: '#000000',
  card: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235,235,245,0.6)',
  separator: 'rgba(84,84,88,0.65)',
  accent: '#3CC4AE',
  onAccent: '#00201B',
  accentSoft: 'rgba(60,196,174,0.2)',
  onAccentSoft: '#7FE3D1',
  positive: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF453A',
  fill: 'rgba(118,118,128,0.24)',
  range: 'rgba(60,196,174,0.3)',
  gold: '#F5C542',
  hero: '#0B3B35',
  onHero: '#FFFFFF',
};

// M3 roles, values from SchemeTonalSpot of seed #0F7B6C (@material/material-color-utilities 0.3.0).
// positive / warning / gold / hero are design decisions (M3 has no success role).
const mdLight: Colors = {
  background: '#F5FBF8', // surface
  card: '#E9EFEC', // surfaceContainer
  text: '#171D1B', // onSurface
  textSecondary: '#3F4946', // onSurfaceVariant
  separator: '#BEC9C5', // outlineVariant
  accent: '#016B5D', // primary
  onAccent: '#FFFFFF', // onPrimary
  accentSoft: '#9FF2E0', // primaryContainer
  onAccentSoft: '#005046', // onPrimaryContainer
  positive: '#1E7B34',
  warning: '#7A5900',
  danger: '#BA1A1A', // error
  fill: '#DEE4E1', // surfaceContainerHighest
  range: '#9FF2E0',
  gold: '#8A6500',
  hero: '#062A26',
  onHero: '#FFFFFF',
};

const mdDark: Colors = {
  background: '#0E1513', // surface
  card: '#1B211F', // surfaceContainer
  text: '#DEE4E1', // onSurface
  textSecondary: '#BEC9C5', // onSurfaceVariant
  separator: '#3F4946', // outlineVariant
  accent: '#83D5C5', // primary
  onAccent: '#003730', // onPrimary
  accentSoft: '#005046', // primaryContainer
  onAccentSoft: '#9FF2E0', // onPrimaryContainer
  positive: '#6DD58C',
  warning: '#F5BF48',
  danger: '#FFB4AB', // error
  fill: '#303634', // surfaceContainerHighest
  range: '#005046',
  gold: '#F5C542',
  hero: '#0B3B35',
  onHero: '#FFFFFF',
};

/**
 * Rubik (Google Fonts, @expo-google-fonts/rubik): one family for Latin and Hebrew, so mixed
 * lines (Hebrew + tickers + numbers) keep the same look in both directions. User request
 * 2026-11-14. Custom fonts do not synthesize weights reliably on Android, so each weight is
 * its own family and `fontWeight` is not set alongside it.
 */
export const Fonts = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semibold: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
} as const;

export type TypeRole = 'largeTitle' | 'title' | 'title3' | 'headline' | 'body' | 'subhead' | 'footnote' | 'caption';

const iosType: Record<TypeRole, TextStyle> = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontFamily: Fonts.bold },
  title: { fontSize: 28, lineHeight: 34, fontFamily: Fonts.bold },
  title3: { fontSize: 20, lineHeight: 25, fontFamily: Fonts.semibold },
  headline: { fontSize: 17, lineHeight: 22, fontFamily: Fonts.semibold },
  body: { fontSize: 17, lineHeight: 22, fontFamily: Fonts.regular },
  subhead: { fontSize: 15, lineHeight: 20, fontFamily: Fonts.regular },
  footnote: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.regular },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.regular },
};

const mdType: Record<TypeRole, TextStyle> = {
  largeTitle: { fontSize: 28, lineHeight: 36, fontFamily: Fonts.regular }, // Headline medium
  title: { fontSize: 22, lineHeight: 28, fontFamily: Fonts.regular }, // Title large
  title3: { fontSize: 22, lineHeight: 28, fontFamily: Fonts.medium }, // Title large, emphasized
  headline: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.medium,
    letterSpacing: 0.2,
  }, // Title medium
  body: { fontSize: 16, lineHeight: 24, fontFamily: Fonts.regular, letterSpacing: 0.5 }, // Body large
  subhead: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    letterSpacing: 0.2,
  }, // Body medium
  footnote: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Fonts.regular,
    letterSpacing: 0.4,
  }, // Body small
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Fonts.medium,
    letterSpacing: 0.5,
  }, // Label medium
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
