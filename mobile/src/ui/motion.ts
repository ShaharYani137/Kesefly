/**
 * Motion tokens. Springs follow M3 Expressive, Expressive scheme
 * (`.claude/skills/m3-expressive/references/tokens.md`, "Motion springs"):
 *   spatial  default 0.8 / 380, fast 0.6 / 800, slow 0.8 / 200   (damping ratio / stiffness)
 *   effects  default 1.0 / 1600, fast 1.0 / 3800, slow 1.0 / 800
 * Spatial springs (position, size, scale) may overshoot. Effects springs (opacity, color) never do.
 *
 * Reanimated takes an absolute damping coefficient, so we convert:
 *   damping = ratio * 2 * sqrt(stiffness * mass), with mass = 1.
 *
 * DESIGN DECISIONS (not in the references): list stagger 50 ms per item, capped at 8 items;
 * splash intro length ~1.3 s. Both platforms use these springs (iOS HIG gives no numeric spring values).
 */
import { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

type Spring = { damping: number; stiffness: number; mass: number };

const spring = (ratio: number, stiffness: number): Spring => ({
  damping: ratio * 2 * Math.sqrt(stiffness),
  stiffness,
  mass: 1,
});

export const Springs = {
  spatialDefault: spring(0.8, 380),
  spatialFast: spring(0.6, 800),
  spatialSlow: spring(0.8, 200),
  effectsDefault: spring(1, 1600),
  effectsFast: spring(1, 3800),
  effectsSlow: spring(1, 800),
};

const STAGGER_MS = 50;
const STAGGER_MAX = 8;

const delayFor = (index: number) => Math.min(index, STAGGER_MAX) * STAGGER_MS;

/** Card / list item entrance: rises into place with the default spatial spring. */
export const enterItem = (index = 0) => {
  const s = Springs.spatialDefault;
  return FadeInDown.delay(delayFor(index)).springify().damping(s.damping).stiffness(s.stiffness).mass(s.mass);
};

/** Chat bubble entrance: rises from below with the fast spatial spring. */
export const enterBubble = () => {
  const s = Springs.spatialFast;
  return FadeInUp.springify().damping(s.damping).stiffness(s.stiffness).mass(s.mass);
};

/** Small icon pop (check marks): fast spatial spring, slight bounce. */
export const enterPop = (index = 0) => {
  const s = Springs.spatialFast;
  return ZoomIn.delay(150 + delayFor(index))
    .springify()
    .damping(s.damping)
    .stiffness(s.stiffness)
    .mass(s.mass);
};

/** Plain fade for text that should not move. */
export const enterFade = (index = 0) => FadeIn.delay(delayFor(index)).duration(250);
