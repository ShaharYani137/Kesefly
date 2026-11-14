/**
 * Small rectangular country flags drawn in SVG (not emoji), so they look the same on every
 * phone. 3:2 ratio, slightly rounded corners, a thin outline so white parts show on dark cards.
 */
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

const BLUE_US = '#3C3B6E';
const RED_US = '#B22234';
const BLUE_IL = '#0038B8';

export function Flag({ country, width = 27 }: { country: 'US' | 'IL'; width?: number }) {
  const w = 30;
  const h = 20;
  return (
    <Svg width={width} height={(width * h) / w} viewBox={`0 0 ${w} ${h}`} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <ClipPath id={`clip-${country}`}>
          <Rect x={0} y={0} width={w} height={h} rx={2.5} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#clip-${country})`}>{country === 'US' ? <Us w={w} h={h} /> : <Il w={w} h={h} />}</G>
      <Rect x={0.25} y={0.25} width={w - 0.5} height={h - 0.5} rx={2.4} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} />
    </Svg>
  );
}

/** 13 stripes, blue canton with a 5x4 grid of stars (drawn as dots at this size). */
function Us({ w, h }: { w: number; h: number }) {
  const sh = h / 13;
  const cw = w * 0.42;
  const ch = sh * 7;
  return (
    <>
      <Rect x={0} y={0} width={w} height={h} fill="#FFFFFF" />
      {Array.from({ length: 7 }, (_, i) => (
        <Rect key={i} x={0} y={i * 2 * sh} width={w} height={sh} fill={RED_US} />
      ))}
      <Rect x={0} y={0} width={cw} height={ch} fill={BLUE_US} />
      {Array.from({ length: 4 }, (_, r) =>
        Array.from({ length: 5 }, (__, c) => <Circle key={`${r}-${c}`} cx={(c + 0.5) * (cw / 5)} cy={(r + 0.5) * (ch / 4)} r={0.55} fill="#FFFFFF" />),
      )}
    </>
  );
}

/** White field, two blue stripes, blue Star of David (two triangles). */
function Il({ w, h }: { w: number; h: number }) {
  const cx = w / 2;
  const cy = h / 2;
  const r = h * 0.2;
  const tri = (flip: number) => {
    const pts = [0, 1, 2].map((k) => {
      const a = ((-90 + flip * 180 + k * 120) * Math.PI) / 180;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    });
    return `M${pts[0]} L${pts[1]} L${pts[2]} Z`;
  };
  return (
    <>
      <Rect x={0} y={0} width={w} height={h} fill="#FFFFFF" />
      <Rect x={0} y={h * 0.1} width={w} height={h * 0.15} fill={BLUE_IL} />
      <Rect x={0} y={h * 0.75} width={w} height={h * 0.15} fill={BLUE_IL} />
      <Path d={tri(0)} fill="none" stroke={BLUE_IL} strokeWidth={0.9} />
      <Path d={tri(1)} fill="none" stroke={BLUE_IL} strokeWidth={0.9} />
    </>
  );
}
