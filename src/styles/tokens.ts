// Design system tokens resolved from tokens.json
export const TOKENS = {
  white:        '#ffffff',
  black100:     '#333333',
  black75:      '#666666',
  black50:      '#999999',
  black25:      '#cccccc',
  black20:      '#d6d6d6',
  black15:      '#e2e2e2',
  black10:      '#ebebeb',
  black5:       '#f2f2f2',
  blueVibrant:  '#00a3e0',
  greenVibrant: '#43b02a',
  yellowVibrant:'#f2a900',
  orangeVibrant:'#ff6a13',
  redVibrant:   '#c81212',
  purpleVibrant:'#a15a95',
};

export const CHART_PALETTE: string[] = [
  TOKENS.blueVibrant,
  TOKENS.greenVibrant,
  TOKENS.yellowVibrant,
  TOKENS.orangeVibrant,
  TOKENS.redVibrant,
  TOKENS.purpleVibrant,
];

// MUI X Charts-matching layout constants
export const CHART = {
  WIDTH:        600,
  HEIGHT:       300,
  MARGIN:       { top: 24, right: 24, bottom: 24, left: 24 },
  Y_AXIS_WIDTH: 45,
  X_AXIS_HEIGHT:25,
  BAR_GAP:      8,
  LINE_STROKE:  2,
  MARK_RADIUS:  4,
  GRID_LINES:   5,
  LEGEND_HEIGHT:   32,
  Y_LABEL_FRAME_W: 20,   // width reserved for the optional rotated Y-axis label
};

export const TEXT = {
  TICK_SIZE:   12,
  LABEL_SIZE:  12,
  FONT_FAMILY: 'Inter',
};

export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16) / 255,
    g: parseInt(clean.substring(2, 4), 16) / 255,
    b: parseInt(clean.substring(4, 6), 16) / 255,
  };
}

export function solidFill(hex: string): SolidPaint {
  return { type: 'SOLID', color: hexToRGB(hex) };
}

export function formatTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}k`;
  return value % 1 === 0  ? String(Math.round(value)) : value.toFixed(1);
}
