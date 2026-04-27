import { GenerateChartPayload, BarChartOptions } from '../types';
import { TOKENS, CHART, CHART_PALETTE, TEXT, solidFill } from '../styles/tokens';
import { buildXAxisConfig } from './xAxis';
import { buildLegend } from './legend';

export async function createBarChart(payload: GenerateChartPayload): Promise<FrameNode> {
  await figma.loadFontAsync({ family: TEXT.FONT_FAMILY, style: 'Regular' });

  const { data, xField, yFields, colors, barOptions } = payload;
  const opts: BarChartOptions = barOptions;
  const palette = colors.length > 0 ? colors : CHART_PALETTE;

  return opts.layout === 'horizontal'
    ? buildHorizontalBarChart(data, xField, yFields, palette, opts)
    : buildVerticalBarChart(data, xField, yFields, palette, opts);
}

// ── Vertical bar chart ────────────────────────────────────────────────────────

function buildVerticalBarChart(
  data: GenerateChartPayload['data'],
  xField: string,
  yFields: string[],
  palette: string[],
  opts: BarChartOptions
): FrameNode {
  const isStacked = opts.stacked && yFields.length > 1;
  const allValues = isStacked
    ? data.map(r => yFields.reduce((s, f) => s + (Number(r[f]) || 0), 0))
    : yFields.flatMap(f => data.map(r => Number(r[f]) || 0));
  const maxVal = Math.max(...allValues, 1);
  const yLabelFrameW = opts.yAxisLabel ? CHART.Y_LABEL_FRAME_W : 0;
  const yGroupGap    = opts.yAxisLabel ? 16 : 0;
  const yGroupW      = yLabelFrameW + yGroupGap + CHART.Y_AXIS_WIDTH;
  const bodyW  = CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right - yGroupW;
  const innerW = CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right;
  const totalH = CHART.HEIGHT + CHART.MARGIN.top + CHART.MARGIN.bottom + CHART.X_AXIS_HEIGHT + CHART.LEGEND_HEIGHT;

  // ── Compute X-axis labels before building any frames ──────────────────────
  const xAxisCfg = buildXAxisConfig(data, xField, bodyW);

  // Root
  const root = figma.createFrame();
  root.name = 'Bar Chart';
  root.layoutMode = 'VERTICAL';
  root.primaryAxisSizingMode = 'FIXED';
  root.counterAxisSizingMode = 'AUTO';
  root.paddingTop    = CHART.MARGIN.top;    root.paddingBottom = CHART.MARGIN.bottom;
  root.paddingLeft   = CHART.MARGIN.left;   root.paddingRight  = CHART.MARGIN.right;
  root.itemSpacing   = 0;
  root.fills = [solidFill(TOKENS.white)];
  root.resize(CHART.WIDTH, totalH);

  // Plot area (Y axis + chart body)
  const plotArea = figma.createFrame();
  plotArea.name = 'Plot Area';
  plotArea.layoutMode = 'HORIZONTAL';
  plotArea.primaryAxisSizingMode = 'FIXED';
  plotArea.counterAxisSizingMode = 'FIXED';
  plotArea.clipsContent = false; // allow y-axis labels to center over top/bottom grid lines
  plotArea.itemSpacing = 0;
  plotArea.fills = [];
  plotArea.resize(
    CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right,
    CHART.HEIGHT + CHART.X_AXIS_HEIGHT,
  );
  root.appendChild(plotArea);
  plotArea.layoutAlign = 'STRETCH';

  // ── Y-axis group (label + tick labels, horizontal, 16px gap) ────────────────
  const yGroup = figma.createFrame();
  yGroup.name = 'Y Axis Group';
  yGroup.layoutMode = 'HORIZONTAL';
  yGroup.primaryAxisSizingMode = 'FIXED';
  yGroup.counterAxisSizingMode = 'FIXED';
  yGroup.counterAxisAlignItems = 'MIN';
  yGroup.itemSpacing = yGroupGap;
  yGroup.clipsContent = false;
  yGroup.fills = [];
  yGroup.resize(yGroupW, CHART.HEIGHT);
  plotArea.appendChild(yGroup);

  if (opts.yAxisLabel) {
    const yLabelFrame = figma.createFrame();
    yLabelFrame.name = 'Y Axis Label';
    yLabelFrame.layoutMode = 'NONE';
    yLabelFrame.clipsContent = false;
    yLabelFrame.fills = [];
    yLabelFrame.resize(yLabelFrameW, CHART.HEIGHT);

    const lbl = figma.createText();
    lbl.fontName = { family: TEXT.FONT_FAMILY, style: 'Regular' };
    lbl.fontSize = TEXT.TICK_SIZE;
    lbl.fills = [solidFill(TOKENS.black75)];
    lbl.characters = opts.yAxisLabel;
    lbl.textAlignHorizontal = 'CENTER';
    lbl.textAlignVertical = 'CENTER';
    const lblH = TEXT.TICK_SIZE + 4;
    lbl.resize(CHART.HEIGHT, lblH);
    lbl.x = (yLabelFrameW - lblH) / 2;
    lbl.y = CHART.HEIGHT;
    lbl.rotation = 90;
    yLabelFrame.appendChild(lbl);
    yGroup.appendChild(yLabelFrame);
  }

  // Y axis — absolute positioning so each label is centred exactly on its grid line
  const LABEL_BOX_H = 16; // px box height for a single 12px text line
  const yAxis = figma.createFrame();
  yAxis.name = 'Y Axis';
  yAxis.layoutMode = 'NONE';
  yAxis.clipsContent = false;
  yAxis.fills = [];
  yAxis.resize(CHART.Y_AXIS_WIDTH, CHART.HEIGHT);
  yGroup.appendChild(yAxis);

  for (let i = 0; i <= CHART.GRID_LINES; i++) {
    const v = maxVal * (1 - i / CHART.GRID_LINES);
    const gridY = Math.round((i / CHART.GRID_LINES) * CHART.HEIGHT);
    const t = figma.createText();
    t.fontName = { family: TEXT.FONT_FAMILY, style: 'Regular' };
    t.fontSize = TEXT.TICK_SIZE;
    t.fills = [solidFill(TOKENS.black75)];
    t.characters = formatTick(v);
    t.textAlignHorizontal = 'RIGHT';
    t.textAlignVertical = 'CENTER';
    t.resize(CHART.Y_AXIS_WIDTH - 8, LABEL_BOX_H);
    t.x = 0;
    t.y = gridY - LABEL_BOX_H / 2;
    yAxis.appendChild(t);
  }

  // Chart body
  const body = figma.createFrame();
  body.name = 'Chart Body';
  body.layoutMode = 'VERTICAL';
  body.primaryAxisSizingMode = 'FIXED';
  body.counterAxisSizingMode = 'FIXED';
  body.itemSpacing = 0;
  body.fills = [];
  body.resize(bodyW, CHART.HEIGHT + CHART.X_AXIS_HEIGHT);
  plotArea.appendChild(body);
  body.layoutGrow = 1;

  // Grid + bars layer
  const canvas = figma.createFrame();
  canvas.name = 'Grid and Bars';
  canvas.layoutMode = 'HORIZONTAL';
  canvas.primaryAxisSizingMode = 'FIXED';
  canvas.counterAxisSizingMode = 'FIXED';
  canvas.itemSpacing = 0;
  canvas.fills = [];
  canvas.clipsContent = false; // allows tick marks to render below canvas boundary
  canvas.resize(bodyW, CHART.HEIGHT);
  body.appendChild(canvas);

  // ── Horizontal grid lines — dashed Black-25, baseline solid Black-50 ──────
  if (opts.showGridH) {
    for (let i = 0; i <= CHART.GRID_LINES; i++) {
      const y = Math.round((i / CHART.GRID_LINES) * CHART.HEIGHT);
      const isBaseline = i === CHART.GRID_LINES;
      const line = figma.createLine();
      line.name = isBaseline ? 'Baseline' : `Grid H ${i}`;
      line.resize(bodyW, 0);
      line.strokes      = [solidFill(isBaseline ? TOKENS.black50 : TOKENS.black25)];
      line.strokeWeight = 1;
      if (!isBaseline) line.dashPattern = [4, 4];
      line.constraints  = { horizontal: 'SCALE', vertical: 'SCALE' };
      canvas.appendChild(line);
      line.layoutPositioning = 'ABSOLUTE';
      line.x = 0; line.y = y;
    }
  } else {
    // Always draw at least the baseline
    const baseline = figma.createLine();
    baseline.name = 'Baseline';
    baseline.resize(bodyW, 0);
    baseline.strokes      = [solidFill(TOKENS.black50)];
    baseline.strokeWeight = 1;
    baseline.constraints  = { horizontal: 'SCALE', vertical: 'MIN' };
    canvas.appendChild(baseline);
    baseline.layoutPositioning = 'ABSOLUTE';
    baseline.x = 0; baseline.y = CHART.HEIGHT - 1;
  }

  // Vertical grid lines (solid rectangles — unchanged style)
  if (opts.showGridV) {
    data.forEach((_, i) => {
      const x = Math.round((i / Math.max(data.length - 1, 1)) * bodyW);
      const rect = figma.createRectangle();
      rect.name = `Grid V ${i}`;
      rect.resize(1, CHART.HEIGHT);
      rect.fills = [solidFill(TOKENS.black15)];
      rect.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
      canvas.appendChild(rect);
      rect.layoutPositioning = 'ABSOLUTE';
      rect.x = x; rect.y = 0;
    });
  }

  // Bars area
  const barsArea = figma.createFrame();
  barsArea.name = 'Bars';
  barsArea.layoutMode = 'HORIZONTAL';
  barsArea.primaryAxisSizingMode = 'FIXED';
  barsArea.counterAxisSizingMode = 'FIXED';
  barsArea.primaryAxisAlignItems = 'SPACE_BETWEEN';
  barsArea.counterAxisAlignItems = 'MAX';
  barsArea.paddingLeft   = 0;
  barsArea.paddingRight  = 0;
  barsArea.itemSpacing   = 0;
  barsArea.fills = [];
  barsArea.resize(bodyW, CHART.HEIGHT);
  canvas.appendChild(barsArea);
  barsArea.layoutSizingHorizontal = 'FILL';
  barsArea.layoutSizingVertical = 'FILL';

  data.forEach(row => {
    const colFrame = figma.createFrame();
    colFrame.name = `Col: ${row[xField]}`;
    colFrame.primaryAxisSizingMode = 'FIXED';
    colFrame.counterAxisSizingMode = 'FIXED';
    colFrame.paddingLeft  = CHART.BAR_GAP / 2;
    colFrame.paddingRight = CHART.BAR_GAP / 2;
    colFrame.itemSpacing  = isStacked ? 0 : 2;
    colFrame.fills = [];
    colFrame.resize(Math.floor(bodyW / data.length), CHART.HEIGHT);
    barsArea.appendChild(colFrame);
    colFrame.layoutGrow = 1;

    if (isStacked) {
      colFrame.layoutMode = 'VERTICAL';
      colFrame.primaryAxisAlignItems = 'MAX'; // push stack to bottom
      colFrame.counterAxisAlignItems = 'CENTER';

      const barW = Math.max(4, Math.floor(bodyW / data.length) - CHART.BAR_GAP);
      // Top-most non-zero field gets rounded top corners
      const topField = [...yFields].reverse().find(f => (Number(row[f]) || 0) > 0);

      // Append reversed so series[0] ends up at the visual bottom
      [...yFields].reverse().forEach((field, ri) => {
        const si = yFields.length - 1 - ri;
        const value = Number(row[field]) || 0;
        if (value === 0) return;
        const barH = Math.max(1, Math.round((value / maxVal) * CHART.HEIGHT));
        const rect = figma.createRectangle();
        rect.name = `Bar: ${field}`;
        rect.resize(barW, barH);
        rect.fills = [solidFill(palette[si % palette.length])];
        if (field === topField && opts.borderRadius > 0) {
          (rect as RectangleNode).topLeftRadius  = opts.borderRadius;
          (rect as RectangleNode).topRightRadius = opts.borderRadius;
          (rect as RectangleNode).bottomLeftRadius  = 0;
          (rect as RectangleNode).bottomRightRadius = 0;
        }
        colFrame.appendChild(rect);
      });

      if (opts.showBarLabels) {
        const total = yFields.reduce((s, f) => s + (Number(row[f]) || 0), 0);
        const stackH = yFields.reduce((s, f) => {
          const v = Number(row[f]) || 0;
          return s + (v > 0 ? Math.max(1, Math.round((v / maxVal) * CHART.HEIGHT)) : 0);
        }, 0);
        const lbl = makeText(formatTick(total), 9, TOKENS.black75, 'CENTER');
        colFrame.appendChild(lbl);
        lbl.layoutPositioning = 'ABSOLUTE';
        lbl.resize(colFrame.width - CHART.BAR_GAP, 12);
        lbl.x = 0;
        lbl.y = CHART.HEIGHT - stackH - 14;
      }
    } else {
      colFrame.layoutMode = 'HORIZONTAL';
      colFrame.counterAxisAlignItems = 'MAX';
      colFrame.primaryAxisAlignItems = 'CENTER';

      yFields.forEach((field, si) => {
        const value = Number(row[field]) || 0;
        const color = palette[si % palette.length];
        const barH  = Math.max(2, (value / maxVal) * CHART.HEIGHT);

        const barWrap = figma.createFrame();
        barWrap.name = `Bar: ${field}`;
        barWrap.layoutMode = 'VERTICAL';
        barWrap.primaryAxisSizingMode = 'FIXED';
        barWrap.counterAxisSizingMode = 'FIXED';
        barWrap.primaryAxisAlignItems = 'MAX';
        barWrap.counterAxisAlignItems = 'CENTER';
        barWrap.fills = [];
        barWrap.itemSpacing = 2;
        barWrap.resize(
          Math.floor((colFrame.width - CHART.BAR_GAP - (yFields.length - 1) * 2) / yFields.length),
          CHART.HEIGHT,
        );
        colFrame.appendChild(barWrap);
        barWrap.layoutGrow = 1;

        if (opts.showBarLabels) {
          const labelText = makeText(formatTick(value), 9, TOKENS.black75, 'CENTER');
          barWrap.appendChild(labelText);
        }

        const rect = figma.createRectangle();
        rect.name = 'Bar';
        rect.resize(Math.max(4, barWrap.width - 2), Math.round(barH));
        rect.fills = [solidFill(color)];
        rect.cornerRadius = opts.borderRadius;
        rect.constraints  = { horizontal: 'SCALE', vertical: 'SCALE' };
        rect.layoutGrow   = 0;
        barWrap.appendChild(rect);
      });
    }
  });

  // ── Legend ────────────────────────────────────────────────────────────────
  const legend = buildLegend(yFields, palette, innerW, 'bar');
  root.appendChild(legend);

  // ── Tick marks on baseline (absolutely positioned inside canvas) ──────────
  // canvas.clipsContent = false so they render 4px below the canvas boundary,
  // right at the top edge of the xAxis label area.
  xAxisCfg.labels.forEach((lbl, i) => {
    if (!lbl.visible) return;
    const tickX = Math.round((i + 0.5) * bodyW / data.length);
    const tick = figma.createRectangle();
    tick.name = `Tick ${i}`;
    tick.resize(1, 4);
    tick.fills = [solidFill(TOKENS.black50)];
    tick.constraints = { horizontal: 'SCALE', vertical: 'MIN' };
    canvas.appendChild(tick);
    tick.layoutPositioning = 'ABSOLUTE';
    tick.x = tickX;
    tick.y = CHART.HEIGHT;
  });

  // ── X axis labels — direct text children in horizontal frame ──────────────
  // Same pattern as the original (text nodes with layoutGrow=1).
  // Hidden labels use an empty spacer frame to hold their slot position.
  const xAxis = figma.createFrame();
  xAxis.name = 'X Axis';
  xAxis.layoutMode = 'HORIZONTAL';
  xAxis.primaryAxisSizingMode = 'FIXED';
  xAxis.counterAxisSizingMode = 'FIXED';
  xAxis.primaryAxisAlignItems = 'MIN';
  xAxis.counterAxisAlignItems = 'CENTER';
  xAxis.itemSpacing = 0;
  xAxis.fills = [];
  xAxis.resize(bodyW, CHART.X_AXIS_HEIGHT);
  body.appendChild(xAxis);

  xAxisCfg.labels.forEach(lbl => {
    if (lbl.visible) {
      const t = makeText(lbl.text, TEXT.TICK_SIZE, TOKENS.black75, 'CENTER');
      t.layoutGrow = 1;
      xAxis.appendChild(t);
    } else {
      // Invisible spacer — holds the slot position so SPACE_BETWEEN stays aligned
      const spacer = figma.createFrame();
      spacer.name = 'Label Spacer';
      spacer.layoutMode = 'NONE';
      spacer.fills = [];
      spacer.layoutGrow = 1;
      spacer.resize(1, CHART.X_AXIS_HEIGHT);
      xAxis.appendChild(spacer);
    }
  });

  return root;
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────

function buildHorizontalBarChart(
  data: GenerateChartPayload['data'],
  xField: string,
  yFields: string[],
  palette: string[],
  opts: BarChartOptions
): FrameNode {
  const isStacked = opts.stacked && yFields.length > 1;
  const allValues = isStacked
    ? data.map(r => yFields.reduce((s, f) => s + (Number(r[f]) || 0), 0))
    : yFields.flatMap(f => data.map(r => Number(r[f]) || 0));
  const maxVal = Math.max(...allValues, 1);
  const BAR_H         = 18;
  const GROUP_GAP     = 8;
  const BAR_GAP_INNER = 3;
  const LABEL_W       = 100;
  const VALUE_W       = 36;
  const bodyW  = CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right - LABEL_W - VALUE_W;
  const groupH = isStacked
    ? BAR_H
    : yFields.length * BAR_H + (yFields.length - 1) * BAR_GAP_INNER;
  const totalBarsH = data.length * groupH + (data.length - 1) * GROUP_GAP;
  const totalH = totalBarsH + CHART.MARGIN.top + CHART.MARGIN.bottom + CHART.X_AXIS_HEIGHT;

  const root = figma.createFrame();
  root.name = 'Bar Chart (Horizontal)';
  root.layoutMode = 'VERTICAL';
  root.primaryAxisSizingMode = 'FIXED';
  root.counterAxisSizingMode = 'FIXED';
  root.paddingTop    = CHART.MARGIN.top;    root.paddingBottom = CHART.MARGIN.bottom;
  root.paddingLeft   = CHART.MARGIN.left;   root.paddingRight  = CHART.MARGIN.right;
  root.itemSpacing = 0;
  root.fills = [solidFill(TOKENS.white)];
  root.resize(CHART.WIDTH, Math.max(200, totalH));

  // Data rows
  data.forEach(row => {
    const groupFrame = figma.createFrame();
    groupFrame.name = `Group: ${row[xField]}`;
    groupFrame.layoutMode = 'HORIZONTAL';
    groupFrame.primaryAxisSizingMode = 'FIXED';
    groupFrame.counterAxisSizingMode = 'AUTO';
    groupFrame.counterAxisAlignItems = 'CENTER';
    groupFrame.fills = [];
    groupFrame.resize(CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right, groupH + GROUP_GAP);
    root.appendChild(groupFrame);

    const catLabel = makeText(
      String(row[xField] ?? ''), TEXT.TICK_SIZE, TOKENS.black75, 'RIGHT'
    );
    catLabel.resize(LABEL_W - 8, BAR_H);
    catLabel.textTruncation = 'ENDING';
    groupFrame.appendChild(catLabel);

    if (isStacked) {
      const stackRow = figma.createFrame();
      stackRow.name = 'Bars';
      stackRow.layoutMode = 'HORIZONTAL';
      stackRow.primaryAxisSizingMode = 'FIXED';
      stackRow.counterAxisSizingMode = 'FIXED';
      stackRow.counterAxisAlignItems = 'CENTER';
      stackRow.primaryAxisAlignItems = 'MIN';
      stackRow.itemSpacing = 0;
      stackRow.fills = [];
      stackRow.resize(bodyW, BAR_H);
      groupFrame.appendChild(stackRow);

      // Rightmost non-zero field gets rounded right corners
      const rightField = [...yFields].reverse().find(f => (Number(row[f]) || 0) > 0);

      yFields.forEach((field, si) => {
        const value = Number(row[field]) || 0;
        if (value === 0) return;
        const segW = Math.max(2, Math.round((value / maxVal) * bodyW));
        const rect = figma.createRectangle();
        rect.name = `Bar: ${field}`;
        rect.resize(segW, BAR_H - 4);
        rect.fills = [solidFill(palette[si % palette.length])];
        if (field === rightField && opts.borderRadius > 0) {
          (rect as RectangleNode).topRightRadius    = opts.borderRadius;
          (rect as RectangleNode).bottomRightRadius = opts.borderRadius;
          (rect as RectangleNode).topLeftRadius     = 0;
          (rect as RectangleNode).bottomLeftRadius  = 0;
        }
        stackRow.appendChild(rect);
      });

      if (opts.showBarLabels) {
        const total = yFields.reduce((s, f) => s + (Number(row[f]) || 0), 0);
        const totalW = yFields.reduce((s, f) => {
          const v = Number(row[f]) || 0;
          return s + (v > 0 ? Math.max(2, Math.round((v / maxVal) * bodyW)) : 0);
        }, 0);
        const t = makeText(formatTick(total), 9, TOKENS.black75, 'LEFT');
        t.x = totalW + 4;
        stackRow.appendChild(t);
      }
    } else {
      const barsCol = figma.createFrame();
      barsCol.name = 'Bars';
      barsCol.layoutMode = 'VERTICAL';
      barsCol.primaryAxisSizingMode = 'FIXED';
      barsCol.counterAxisSizingMode = 'FIXED';
      barsCol.primaryAxisAlignItems = 'CENTER';
      barsCol.itemSpacing = BAR_GAP_INNER;
      barsCol.fills = [];
      barsCol.resize(bodyW, groupH);
      groupFrame.appendChild(barsCol);

      yFields.forEach((field, si) => {
        const value = Number(row[field]) || 0;
        const color = palette[si % palette.length];
        const barW  = Math.max(2, (value / maxVal) * bodyW);

        const barRow = figma.createFrame();
        barRow.name = `Bar: ${field}`;
        barRow.layoutMode = 'HORIZONTAL';
        barRow.primaryAxisSizingMode = 'FIXED';
        barRow.counterAxisSizingMode = 'FIXED';
        barRow.counterAxisAlignItems = 'CENTER';
        barRow.fills = [];
        barRow.resize(bodyW, BAR_H);
        barsCol.appendChild(barRow);

        const rect = figma.createRectangle();
        rect.name = 'Bar';
        rect.resize(Math.round(barW), BAR_H - 4);
        rect.fills = [solidFill(color)];
        rect.cornerRadius = opts.borderRadius;
        rect.constraints  = { horizontal: 'SCALE', vertical: 'SCALE' };
        barRow.appendChild(rect);

        if (opts.showBarLabels && value > 0) {
          const t = makeText(formatTick(value), 9, TOKENS.black75, 'LEFT');
          t.x = Math.round(barW) + 4;
          barRow.appendChild(t);
        }
      });
    }
  });

  // Footer row: blank label spacer + axis tick labels
  const headerRow = figma.createFrame();
  headerRow.name = 'X Axis Ticks';
  headerRow.layoutMode = 'HORIZONTAL';
  headerRow.primaryAxisSizingMode = 'FIXED';
  headerRow.counterAxisSizingMode = 'FIXED';
  headerRow.fills = [];
  headerRow.resize(CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right, CHART.X_AXIS_HEIGHT);
  root.appendChild(headerRow);

  const labelSpacer = figma.createFrame();
  labelSpacer.name = 'Label spacer';
  labelSpacer.layoutMode = 'NONE';
  labelSpacer.fills = [];
  labelSpacer.resize(LABEL_W, CHART.X_AXIS_HEIGHT);
  headerRow.appendChild(labelSpacer);

  const tickArea = figma.createFrame();
  tickArea.name = 'Tick area';
  tickArea.layoutMode = 'HORIZONTAL';
  tickArea.primaryAxisSizingMode = 'FIXED';
  tickArea.counterAxisSizingMode = 'FIXED';
  tickArea.primaryAxisAlignItems = 'SPACE_BETWEEN';
  tickArea.fills = [];
  tickArea.resize(bodyW, CHART.X_AXIS_HEIGHT);
  headerRow.appendChild(tickArea);

  for (let i = 0; i <= 4; i++) {
    const v = (maxVal / 4) * i;
    const t = makeText(formatTick(v), TEXT.TICK_SIZE, TOKENS.black75, i === 4 ? 'RIGHT' : 'CENTER');
    t.layoutGrow = 0;
    tickArea.appendChild(t);
  }

  return root;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeText(
  content: string,
  size: number,
  color: string,
  align: 'LEFT' | 'CENTER' | 'RIGHT'
): TextNode {
  const t = figma.createText();
  t.fontName = { family: TEXT.FONT_FAMILY, style: 'Regular' };
  t.fontSize = size;
  t.fills    = [solidFill(color)];
  t.characters = content;
  t.textAlignHorizontal = align;
  return t;
}

function formatTick(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
  return value % 1 === 0  ? String(Math.round(value)) : value.toFixed(1);
}
