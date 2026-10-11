type Rgb = readonly [number, number, number];

export interface LabelChipColors {
  readonly background: string;
  readonly text: string;
}

const FALLBACK_COLOR: Rgb = [59, 130, 246];
const LIGHTEST_DARK_SURFACE: Rgb = [30, 41, 57];
const WHITE: Rgb = [255, 255, 255];
const TINT_OPACITY = 0.125;
const TARGET_TEXT_CONTRAST = 4.6;
const LIGHTEN_STEPS = 10;

export function labelChipColors(color: string | null | undefined): LabelChipColors {
  const base = parseHexColor(color) ?? FALLBACK_COLOR;
  const tintedSurface = mix(base, LIGHTEST_DARK_SURFACE, TINT_OPACITY);
  let text = base;
  for (
    let step = 1;
    step <= LIGHTEN_STEPS && contrastRatio(text, tintedSurface) < TARGET_TEXT_CONTRAST;
    step++
  ) {
    text = mix(WHITE, base, step / LIGHTEN_STEPS);
  }
  return {
    background: `rgba(${base.join(', ')}, ${TINT_OPACITY})`,
    text: `rgb(${text.join(', ')})`,
  };
}

export function contrastRatio(first: Rgb, second: Rgb): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

export function parseHexColor(color: string | null | undefined): Rgb | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color?.trim() ?? '');
  if (!match) return null;
  const hex =
    match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function mix(top: Rgb, bottom: Rgb, topWeight: number): Rgb {
  return [
    Math.round(top[0] * topWeight + bottom[0] * (1 - topWeight)),
    Math.round(top[1] * topWeight + bottom[1] * (1 - topWeight)),
    Math.round(top[2] * topWeight + bottom[2] * (1 - topWeight)),
  ];
}

function relativeLuminance(color: Rgb): number {
  const [red, green, blue] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
