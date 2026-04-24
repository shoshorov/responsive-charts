import { DataRow } from '../types';
import { TEXT } from '../styles/tokens';

// ── Public types ──────────────────────────────────────────────────────────────

export interface XAxisLabel {
  text:    string;
  visible: boolean;
}

export interface XAxisConfig {
  labels: XAxisLabel[];
}

// ── Date parsing ──────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Try to parse common date string formats. Returns null on failure. */
export function parseDateSafe(s: string): Date | null {
  const str = String(s).trim();

  // ISO 8601 date or datetime: 2024-01-15, 2024-01-15T...
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // Short ISO: 2024-01
  if (/^\d{4}-\d{2}$/.test(str)) {
    const d = new Date(str + '-01');
    if (!isNaN(d.getTime())) return d;
  }

  // US date: 1/15/2024 or 01/15/24
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // Month name + year: "Jan 2024", "January 2024"
  const monthMatch = str.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthMatch) {
    const idx = MONTH_NAMES.findIndex(m =>
      m.toLowerCase() === monthMatch[1].slice(0, 3).toLowerCase()
    );
    if (idx !== -1) {
      const d = new Date(Number(monthMatch[2]), idx, 1);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Year only: "2024" — allow broad historical range (e.g. 1870 CO₂ data)
  if (/^\d{4}$/.test(str)) {
    const y = Number(str);
    if (y >= 1000 && y <= 2200) return new Date(y, 0, 1);
  }

  return null;
}

/** Returns 'time' if ≥70% of values parse as valid dates, else 'categorical'. */
export function detectScaleType(values: string[]): 'time' | 'categorical' {
  if (values.length === 0) return 'categorical';
  const hits = values.filter(v => parseDateSafe(v) !== null).length;
  return hits / values.length >= 0.7 ? 'time' : 'categorical';
}

// ── Time interval selection ───────────────────────────────────────────────────

export type TimeInterval = 'day' | 'month' | 'quarter' | 'year' | '5year';

/** Choose a semantic tick interval based on total date range. */
export function getTimeInterval(dates: Date[]): TimeInterval {
  if (dates.length < 2) return 'month';
  const ms  = dates.map(d => d.getTime());
  const days = (Math.max(...ms) - Math.min(...ms)) / 86_400_000;

  if (days < 31)        return 'day';
  if (days < 366)       return 'month';
  if (days < 366 * 5)   return 'quarter';
  if (days < 366 * 20)  return 'year';
  return '5year';
}

// ── Label formatting ──────────────────────────────────────────────────────────

/**
 * Format a date for display given the active interval.
 * `prevDate` is used to decide when to include a year hint on month labels.
 */
export function formatDateLabel(
  date: Date,
  interval: TimeInterval,
  prevDate?: Date,
): string {
  const m = date.getMonth();
  const y = date.getFullYear();
  const yy = String(y).slice(2);

  switch (interval) {
    case 'day':
      return `${date.getDate()} ${MONTH_NAMES[m]}`;

    case 'month':
      return `${MONTH_NAMES[m]} '${yy}`;

    case 'quarter': {
      const q = Math.floor(m / 3) + 1;
      return `Q${q} '${yy}`;
    }

    case 'year':
      return String(y);

    case '5year':
      return String(y);
  }
}

// ── Width estimation ──────────────────────────────────────────────────────────

/** Estimate rendered pixel width for `text` at `fontSize`. */
export function estimateLabelWidth(
  text: string,
  fontSize: number = TEXT.TICK_SIZE,
): number {
  // Inter averages ~0.55× font-size per glyph; add 8px horizontal padding
  return Math.ceil(text.length * fontSize * 0.55 + 8);
}

/** Maximum number of labels that fit in `canvasW` without overlap. */
export function calculateMaxLabels(canvasW: number, longestLabel: string): number {
  const labelW = estimateLabelWidth(longestLabel);
  return Math.max(1, Math.floor(canvasW / (labelW + 16)));
}

// ── Label filtering ───────────────────────────────────────────────────────────

/** Step-skip for categorical axes: keep every Nth label. */
export function filterCategorical(count: number, maxLabels: number): boolean[] {
  const step = Math.ceil(count / maxLabels);
  return Array.from({ length: count }, (_, i) => i % step === 0);
}

/** For time axes: show only the labels that fall on a semantic tick boundary. */
export function filterTimeSeries(dates: Date[], interval: TimeInterval): boolean[] {
  return dates.map(date => {
    const m = date.getMonth();
    const y = date.getFullYear();
    switch (interval) {
      case 'day':     return true;
      case 'month':   return true;
      case 'quarter': return m % 3 === 0;
      case 'year':    return m === 0;
      case '5year':   return m === 0 && y % 5 === 0;
    }
  });
}

// ── Collision detection ───────────────────────────────────────────────────────

/**
 * Left-to-right sweep: hide any label whose left edge would overlap
 * the right edge of the previous visible label (plus a 4px gap).
 *
 * @param positions  Centre x of each label slot (pixels)
 * @param widths     Estimated rendered width of each label (pixels)
 */
export function removeOverlaps(
  positions: number[],
  widths: number[],
): boolean[] {
  const visible = new Array<boolean>(positions.length).fill(false);
  let lastRight = -Infinity;

  for (let i = 0; i < positions.length; i++) {
    // Skip hidden items (width=0) — they must not consume space or advance lastRight
    if (widths[i] === 0) continue;

    const left = positions[i] - widths[i] / 2;
    if (left >= lastRight + 4) {
      visible[i] = true;
      lastRight = positions[i] + widths[i] / 2;
    }
  }
  return visible;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Compute which X-axis labels to show and how to format them.
 *
 * Call this *before* building any Figma frames so that the chart builder
 * can reserve the correct heights and positions.
 *
 * @param data        Full data rows
 * @param xField      Name of the X-axis column
 * @param canvasWidth Available horizontal pixels for the axis (bodyW)
 */
export function buildXAxisConfig(
  data: DataRow[],
  xField: string,
  canvasWidth: number,
): XAxisConfig {
  const n = data.length;
  if (n === 0) return { labels: [] };

  const rawValues = data.map(r => String(r[xField] ?? ''));
  const scaleType = detectScaleType(rawValues);

  // ── Formatted labels + initial visibility mask ────────────────────────────

  let formatted: string[];
  let mask: boolean[];

  if (scaleType === 'time') {
    const dates    = rawValues.map(v => parseDateSafe(v) ?? new Date(NaN));
    const validDates = dates.filter(d => !isNaN(d.getTime()));
    const interval = getTimeInterval(validDates.length > 0 ? validDates : [new Date()]);

    // Format — track prev visible date for year annotation on month labels
    let prevDate: Date | undefined;
    formatted = dates.map(d => {
      if (isNaN(d.getTime())) return ''; // unparseable → hide
      const label = formatDateLabel(d, interval, prevDate);
      prevDate = d;
      return label;
    });

    mask = filterTimeSeries(dates, interval);
    // Unparseable dates are always hidden
    dates.forEach((d, i) => { if (isNaN(d.getTime())) mask[i] = false; });

    // If the interval filter leaves too many labels, step-skip among the
    // visible tick positions themselves (not across all n rows, which would
    // miss most ticks since they don't align with multiples of the total step).
    const visibleCount = mask.filter(Boolean).length;
    const longestFiltered = formatted
      .filter((_, i) => mask[i])
      .reduce((a, b) => (a.length > b.length ? a : b), '');
    const maxByWidth = calculateMaxLabels(canvasWidth, longestFiltered || 'MMMM');
    if (visibleCount > maxByWidth) {
      const visibleIndices = mask.map((v, i) => (v ? i : -1)).filter(i => i >= 0);
      const step = Math.ceil(visibleCount / maxByWidth);
      const keepSet = new Set(visibleIndices.filter((_, j) => j % step === 0));
      mask = mask.map((v, i) => v && keepSet.has(i));
    }

  } else {
    // Categorical — truncate very long labels
    formatted = rawValues.map(l => (l.length > 12 ? l.slice(0, 11) + '…' : l));
    const longest = formatted.reduce((a, b) => (a.length > b.length ? a : b), '');
    const maxLabels = calculateMaxLabels(canvasWidth, longest || 'MMMMMM');
    mask = filterCategorical(n, maxLabels);
  }

  // ── Collision-detection final pass ────────────────────────────────────────

  const slotW     = canvasWidth / n;
  const positions = Array.from({ length: n }, (_, i) => (i + 0.5) * slotW);
  const widths    = formatted.map(l => estimateLabelWidth(l));

  // Only check items that survived the first mask
  const maskedWidths = widths.map((w, i) => (mask[i] ? w : 0));
  const noOverlap   = removeOverlaps(positions, maskedWidths);

  // ── Build output ──────────────────────────────────────────────────────────

  const labels: XAxisLabel[] = data.map((_, i) => ({
    text:    formatted[i],
    visible: mask[i] && noOverlap[i],
  }));

  // Always show the first non-empty label (guards against datasets that start
  // with unparseable dates, which produce an empty formatted string).
  const firstReal = labels.findIndex(l => l.text.length > 0);
  if (firstReal >= 0) labels[firstReal].visible = true;

  return { labels };
}
