import { contrastRatio, labelChipColors, parseHexColor } from './label-chip-colors';

const WCAG_AA_NORMAL_TEXT = 4.5;
const DARK_SURFACES: readonly (readonly [number, number, number])[] = [
  [30, 41, 57],
  [17, 24, 39],
  [16, 24, 40],
  [3, 7, 18],
];
const LABEL_COLORS = [
  '#000000',
  '#ffffff',
  '#6366f1',
  '#ef4444',
  '#3b82f6',
  '#f59e0b',
  '#22c55e',
  '#1e293b',
  '#7f1d1d',
  '#fef3c7',
  '#808080',
];

function parseRgb(value: string): [number, number, number] {
  const [red, green, blue] = (value.match(/[\d.]+/g) ?? []).map(Number);
  return [red, green, blue];
}

function chipBackgroundOn(
  surface: readonly [number, number, number],
  background: string,
): [number, number, number] {
  const [red, green, blue, alpha] = (background.match(/[\d.]+/g) ?? []).map(Number);
  return [
    Math.round(red * alpha + surface[0] * (1 - alpha)),
    Math.round(green * alpha + surface[1] * (1 - alpha)),
    Math.round(blue * alpha + surface[2] * (1 - alpha)),
  ];
}

describe('labelChipColors', () => {
  it('keeps the label name readable on every dark surface a chip is drawn on, for any label colour', () => {
    for (const color of LABEL_COLORS) {
      const chip = labelChipColors(color);
      for (const surface of DARK_SURFACES) {
        const ratio = contrastRatio(
          parseRgb(chip.text),
          chipBackgroundOn(surface, chip.background),
        );
        expect(ratio, `${color} on rgb(${surface.join(', ')})`).toBeGreaterThanOrEqual(
          WCAG_AA_NORMAL_TEXT,
        );
      }
    }
  });

  it('leaves a colour that is already readable untouched', () => {
    expect(labelChipColors('#fef3c7').text).toBe('rgb(254, 243, 199)');
  });

  it('lightens a colour that is too dark instead of replacing its hue', () => {
    const [red, green, blue] = parseRgb(labelChipColors('#ef4444').text);
    expect(red).toBeGreaterThan(green);
    expect(red).toBeGreaterThan(blue);
    expect(green).toBeGreaterThan(0x44);
  });

  it('tints the chip with the label colour', () => {
    expect(labelChipColors('#6366f1').background).toBe('rgba(99, 102, 241, 0.125)');
  });

  it('falls back to blue when the label has no usable colour', () => {
    const fallback = labelChipColors('#3b82f6');
    expect(labelChipColors(undefined)).toEqual(fallback);
    expect(labelChipColors('')).toEqual(fallback);
    expect(labelChipColors('tomato')).toEqual(fallback);
  });
});

describe('parseHexColor', () => {
  it('reads six-digit and three-digit hex colours, with or without the hash', () => {
    expect(parseHexColor('#3B82F6')).toEqual([59, 130, 246]);
    expect(parseHexColor('3b82f6')).toEqual([59, 130, 246]);
    expect(parseHexColor('#fa0')).toEqual([255, 170, 0]);
  });

  it('rejects anything else', () => {
    expect(parseHexColor('#3b82f620')).toBeNull();
    expect(parseHexColor('rgb(1, 2, 3)')).toBeNull();
    expect(parseHexColor(null)).toBeNull();
  });
});
