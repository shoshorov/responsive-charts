import { TOKENS, CHART, TEXT, solidFill } from '../styles/tokens';

/**
 * Build a horizontal legend row placed below the chart.
 *
 * @param yFields   Series field names (one entry per series)
 * @param palette   Resolved color per series (index-aligned with yFields)
 * @param innerW    Available inner width — same as plotArea width
 * @param chartType Controls the indicator shape (line+dot vs colour square)
 */
export function buildLegend(
  yFields: string[],
  palette: string[],
  innerW: number,
  chartType: 'bar' | 'line',
): FrameNode {
  const legend = figma.createFrame();
  legend.name = 'Legend';
  legend.layoutMode = 'HORIZONTAL';
  legend.primaryAxisSizingMode = 'FIXED';
  legend.counterAxisSizingMode = 'FIXED';
  legend.primaryAxisAlignItems = 'CENTER';
  legend.counterAxisAlignItems = 'CENTER';
  legend.layoutWrap = 'WRAP';
  legend.itemSpacing = 16;
  legend.counterAxisSpacing = 6;
  legend.fills = [];
  legend.resize(innerW, CHART.LEGEND_HEIGHT);

  yFields.forEach((field, si) => {
    const color = palette[si % palette.length];

    // ── Legend item (indicator + label) ───────────────────────────────────
    const item = figma.createFrame();
    item.name = `Legend: ${field}`;
    item.layoutMode = 'HORIZONTAL';
    item.primaryAxisSizingMode = 'AUTO';
    item.counterAxisSizingMode = 'AUTO';
    item.counterAxisAlignItems = 'CENTER';
    item.itemSpacing = 6;
    item.fills = [];

    // ── Indicator ─────────────────────────────────────────────────────────
    if (chartType === 'line') {
      // ──●── : two short line segments flanking a marker dot
      const indicator = figma.createFrame();
      indicator.name = 'Indicator';
      indicator.layoutMode = 'HORIZONTAL';
      indicator.primaryAxisSizingMode = 'AUTO';
      indicator.counterAxisSizingMode = 'AUTO';
      indicator.counterAxisAlignItems = 'CENTER';
      indicator.itemSpacing = 0;
      indicator.fills = [];

      const seg1 = figma.createRectangle();
      seg1.resize(8, 2);
      seg1.fills = [solidFill(color)];

      const dot = figma.createEllipse();
      dot.resize(CHART.MARK_RADIUS * 2, CHART.MARK_RADIUS * 2);
      dot.fills = [solidFill(TOKENS.white)];
      dot.strokes = [solidFill(color)];
      dot.strokeWeight = CHART.LINE_STROKE;

      const seg2 = figma.createRectangle();
      seg2.resize(8, 2);
      seg2.fills = [solidFill(color)];

      indicator.appendChild(seg1);
      indicator.appendChild(dot);
      indicator.appendChild(seg2);
      item.appendChild(indicator);

    } else {
      // Solid colour square for bar charts
      const square = figma.createRectangle();
      square.name = 'Indicator';
      square.resize(13, 13);
      square.fills = [solidFill(color)];
      square.cornerRadius = 2;
      item.appendChild(square);
    }

    // ── Label ─────────────────────────────────────────────────────────────
    const label = figma.createText();
    label.name = 'Label';
    label.fontName = { family: TEXT.FONT_FAMILY, style: 'Regular' };
    label.fontSize = TEXT.TICK_SIZE;
    label.fills = [solidFill(TOKENS.black75)];
    label.characters = field;

    item.appendChild(label);
    legend.appendChild(item);
  });

  return legend;
}
