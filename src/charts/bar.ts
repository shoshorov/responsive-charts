import { GenerateChartPayload, BarChartOptions } from '../types';
import { TOKENS, CHART, CHART_PALETTE, TEXT, solidFill, formatTick } from '../styles/tokens';
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
  canvas.layoutSizingHorizontal = 'FILL';

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
        rect.layoutSizingHorizontal = 'FILL';
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
        lbl.constraints = { horizontal: 'STRETCH', vertical: 'MIN' };
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
        rect.layoutSizingHorizontal = 'FILL';
      });
    }
  });

  // ── Legend ────────────────────────────────────────────────────────────────
  const legend = buildLegend(yFields, palette, innerW, 'bar');
  root.appendChild(legend);
  legend.layoutSizingHorizontal = 'FILL';

  // ── Tick marks on baseline (absolutely positioned inside canvas) ──────────
  // canvas.clipsContent = false so they render 4px below the canvas boundary,
  // right at the top edge of the xAxis label area.
  xAxisCfg.labels.forEach((lbl, i) => {
    if (!lbl.visible) return;
    const tickX = Math.round((i + 0.5) * bodyW / data.length);
    const tick = figma.createVector();
    tick.name = `Tick ${i}`;
    tick.vectorPaths = [{ windingRule: 'NONZERO', data: 'M 0 0 L 0 4' }];
    tick.strokes = [solidFill(TOKENS.black50)];
    tick.strokeWeight = 1;
    tick.fills = [];
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
  xAxis.layoutSizingHorizontal = 'FILL';

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
  const rawMax = Math.max(...allValues, 1);
  const maxVal = niceMax(rawMax);

  const BAR_H         = 24;   // bar (and track) height
  const GROUP_GAP     = 16;   // gap between rows
  const BAR_GAP_INNER = 4;    // gap between series bars within one row
  const LABEL_W       = 180;  // category label column
  const VALUE_W       = 44;   // room to the right for value labels
  const RADIUS        = 0;    // bar/track corner radius
  const TITLE_H       = opts.yAxisLabel ? 24 : 0; // x-axis title band

  const bodyW  = CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right - LABEL_W - VALUE_W;
  const groupH = isStacked
    ? BAR_H
    : yFields.length * BAR_H + (yFields.length - 1) * BAR_GAP_INNER;
  const totalBarsH = data.length * groupH + (data.length - 1) * GROUP_GAP;
  const totalH = totalBarsH + CHART.MARGIN.top + CHART.MARGIN.bottom + CHART.X_AXIS_HEIGHT + TITLE_H;

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

  // ── Plot area: fixed label column + growing body column ────────────────────
  // Everything that must track the value scale (grid, bars, axis line) lives
  // inside `bodyCol`. On horizontal resize the label column stays fixed and
  // bodyCol grows; its SCALE-constrained children scale with it, keeping the
  // grid aligned to the bars. VALUE_W is reserved as bodyCol padding so the
  // scale maps to the visible bar track, not the value-label gutter.
  const plotArea = figma.createFrame();
  plotArea.name = 'Plot Area';
  plotArea.layoutMode = 'HORIZONTAL';
  plotArea.primaryAxisSizingMode = 'FIXED';
  plotArea.counterAxisSizingMode = 'FIXED';
  plotArea.itemSpacing = 8;
  plotArea.clipsContent = false;
  plotArea.fills = [];
  plotArea.resize(CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right, totalBarsH);
  root.appendChild(plotArea);
  plotArea.layoutSizingHorizontal = 'FILL';

  // Label column
  const labelCol = figma.createFrame();
  labelCol.name = 'Labels';
  labelCol.layoutMode = 'VERTICAL';
  labelCol.primaryAxisSizingMode = 'FIXED';
  labelCol.counterAxisSizingMode = 'FIXED';
  labelCol.itemSpacing = GROUP_GAP;
  labelCol.fills = [];
  labelCol.resize(LABEL_W, totalBarsH);
  plotArea.appendChild(labelCol);

  data.forEach(row => {
    const catLabel = makeText(String(row[xField] ?? ''), TEXT.TICK_SIZE, TOKENS.black100, 'RIGHT');
    catLabel.resize(LABEL_W, groupH);
    catLabel.textAlignVertical = 'CENTER';
    catLabel.textTruncation = 'ENDING';
    labelCol.appendChild(catLabel);
  });

  // Body column (grows on resize)
  const bodyCol = figma.createFrame();
  bodyCol.name = 'Body';
  bodyCol.layoutMode = 'VERTICAL';
  bodyCol.primaryAxisSizingMode = 'FIXED';
  bodyCol.counterAxisSizingMode = 'FIXED';
  bodyCol.itemSpacing = GROUP_GAP;
  bodyCol.paddingRight = VALUE_W;   // reserve value-label gutter; excluded from scale
  bodyCol.clipsContent = false;
  bodyCol.fills = [];
  bodyCol.resize(bodyW + VALUE_W, totalBarsH);
  plotArea.appendChild(bodyCol);
  bodyCol.layoutGrow = 1;

  // Grid + axis overlay — absolute inside bodyCol, SCALE so it tracks resize.
  if (opts.showGridV) {
    for (let i = 1; i <= CHART.GRID_LINES; i++) {
      const x = Math.round((i / CHART.GRID_LINES) * bodyW);
      const line = figma.createLine();
      line.name = `Grid V ${i}`;
      line.resize(totalBarsH, 0);
      line.rotation = -90; // vertical line
      line.strokes      = [solidFill(TOKENS.black25)];
      line.strokeWeight = 1;
      line.dashPattern  = [4, 4];
      bodyCol.appendChild(line);
      line.layoutPositioning = 'ABSOLUTE';
      line.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
      line.x = x;
      line.y = 0;
    }
  }

  const axisLine = figma.createLine();
  axisLine.name = 'X Axis Line';
  axisLine.resize(bodyW, 0);
  axisLine.strokes      = [solidFill(TOKENS.black50)];
  axisLine.strokeWeight = 1;
  bodyCol.appendChild(axisLine);
  axisLine.layoutPositioning = 'ABSOLUTE';
  axisLine.constraints = { horizontal: 'SCALE', vertical: 'MAX' };
  axisLine.x = 0;
  axisLine.y = totalBarsH;

  // Bar rows
  data.forEach(row => {
    if (isStacked) {
      const stackRow = figma.createFrame();
      stackRow.name = `Bars: ${row[xField]}`;
      stackRow.layoutMode = 'NONE';
      stackRow.clipsContent = false;
      stackRow.fills = [];
      stackRow.resize(bodyW, groupH);
      bodyCol.appendChild(stackRow);
      stackRow.layoutSizingHorizontal = 'FILL';

      const track = makeTrack(bodyW, BAR_H, RADIUS);
      stackRow.appendChild(track);
      track.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
      track.x = 0; track.y = 0;

      const rightField = [...yFields].reverse().find(f => (Number(row[f]) || 0) > 0);

      let cumX = 0;
      yFields.forEach((field, si) => {
        const value = Number(row[field]) || 0;
        if (value === 0) return;
        const segW = Math.max(2, Math.round((value / maxVal) * bodyW));
        const rect = figma.createRectangle();
        rect.name = `Bar: ${field}`;
        rect.resize(segW, BAR_H);
        rect.fills = [solidFill(palette[si % palette.length])];
        stackRow.appendChild(rect);
        rect.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
        rect.x = cumX;
        rect.y = 0;
        cumX += segW;
      });

      if (opts.showBarLabels) {
        const total = yFields.reduce((s, f) => s + (Number(row[f]) || 0), 0);
        const t = makeText(formatTick(total), TEXT.TICK_SIZE, TOKENS.black75, 'LEFT');
        t.resize(VALUE_W, BAR_H);
        t.textAlignVertical = 'CENTER';
        stackRow.appendChild(t);
        t.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
        t.x = cumX + 8;
        t.y = 0;
      }
    } else {
      const barsCol = figma.createFrame();
      barsCol.name = `Bars: ${row[xField]}`;
      barsCol.layoutMode = 'VERTICAL';
      barsCol.primaryAxisSizingMode = 'FIXED';
      barsCol.counterAxisSizingMode = 'FIXED';
      barsCol.primaryAxisAlignItems = 'CENTER';
      barsCol.itemSpacing = BAR_GAP_INNER;
      barsCol.clipsContent = false;
      barsCol.fills = [];
      barsCol.resize(bodyW, groupH);
      bodyCol.appendChild(barsCol);
      barsCol.layoutSizingHorizontal = 'FILL';

      yFields.forEach((field, si) => {
        const value = Number(row[field]) || 0;
        const color = palette[si % palette.length];
        const barW  = Math.max(2, Math.round((value / maxVal) * bodyW));

        const barRow = figma.createFrame();
        barRow.name = `Bar: ${field}`;
        barRow.layoutMode = 'NONE';
        barRow.clipsContent = false;
        barRow.fills = [];
        barRow.resize(bodyW, BAR_H);
        barsCol.appendChild(barRow);
        barRow.layoutSizingHorizontal = 'FILL';

        const track = makeTrack(bodyW, BAR_H, RADIUS);
        barRow.appendChild(track);
        track.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
        track.x = 0; track.y = 0;

        const rect = figma.createRectangle();
        rect.name = 'Bar';
        rect.resize(barW, BAR_H);
        rect.fills = [solidFill(color)];
        rect.cornerRadius = RADIUS;
        barRow.appendChild(rect);
        rect.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
        rect.x = 0;
        rect.y = 0;

        if (opts.showBarLabels && value > 0) {
          const t = makeText(formatTick(value), TEXT.TICK_SIZE, TOKENS.black75, 'LEFT');
          t.resize(VALUE_W, BAR_H);
          t.textAlignVertical = 'CENTER';
          barRow.appendChild(t);
          t.constraints = { horizontal: 'SCALE', vertical: 'CENTER' };
          t.x = barW + 8;
          t.y = 0;
        }
      });
    }
  });

  // ── Footer: label spacer + tick labels that scale with the body column ─────
  const TICK_LABEL_W = 44;
  const footerRow = figma.createFrame();
  footerRow.name = 'X Axis';
  footerRow.layoutMode = 'HORIZONTAL';
  footerRow.primaryAxisSizingMode = 'FIXED';
  footerRow.counterAxisSizingMode = 'FIXED';
  footerRow.itemSpacing = 8;
  footerRow.clipsContent = false;
  footerRow.fills = [];
  footerRow.resize(CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right, CHART.X_AXIS_HEIGHT);
  root.appendChild(footerRow);
  footerRow.layoutSizingHorizontal = 'FILL';

  const footSpacer = figma.createFrame();
  footSpacer.name = 'Spacer';
  footSpacer.layoutMode = 'NONE';
  footSpacer.fills = [];
  footSpacer.resize(LABEL_W, CHART.X_AXIS_HEIGHT);
  footerRow.appendChild(footSpacer);

  const tickBody = figma.createFrame();
  tickBody.name = 'Ticks';
  tickBody.layoutMode = 'NONE';
  tickBody.paddingRight = VALUE_W;
  tickBody.clipsContent = false;
  tickBody.fills = [];
  tickBody.resize(bodyW + VALUE_W, CHART.X_AXIS_HEIGHT);
  footerRow.appendChild(tickBody);
  tickBody.layoutGrow = 1;

  for (let i = 0; i <= CHART.GRID_LINES; i++) {
    const v = (maxVal / CHART.GRID_LINES) * i;
    const x = Math.round((i / CHART.GRID_LINES) * bodyW);
    const t = makeText(formatTick(v), TEXT.TICK_SIZE, TOKENS.black100, 'CENTER');
    t.resize(TICK_LABEL_W, CHART.X_AXIS_HEIGHT);
    tickBody.appendChild(t);
    t.constraints = { horizontal: 'SCALE', vertical: 'MIN' };
    t.x = x - TICK_LABEL_W / 2;
    t.y = 0;
  }

  // ── X-axis title (centred under the body column) ───────────────────────────
  if (opts.yAxisLabel) {
    const titleRow = figma.createFrame();
    titleRow.name = 'X Axis Title';
    titleRow.layoutMode = 'HORIZONTAL';
    titleRow.primaryAxisSizingMode = 'FIXED';
    titleRow.counterAxisSizingMode = 'FIXED';
    titleRow.itemSpacing = 8;
    titleRow.fills = [];
    titleRow.resize(CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right, TITLE_H);
    root.appendChild(titleRow);
    titleRow.layoutSizingHorizontal = 'FILL';

    const titleSpacer = figma.createFrame();
    titleSpacer.name = 'Spacer';
    titleSpacer.layoutMode = 'NONE';
    titleSpacer.fills = [];
    titleSpacer.resize(LABEL_W, TITLE_H);
    titleRow.appendChild(titleSpacer);

    const t = makeText(opts.yAxisLabel, TEXT.LABEL_SIZE, TOKENS.black75, 'CENTER');
    t.textAlignVertical = 'CENTER';
    titleRow.appendChild(t);
    t.layoutGrow = 1;
    t.layoutSizingVertical = 'FILL';
  }

  return root;
}

// Round a raw max up to a clean axis maximum (1/2/2.5/5 × 10^n).
function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const exp  = Math.floor(Math.log10(raw));
  const mag  = Math.pow(10, exp);
  const frac = raw / mag;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * mag;
}

// Grey rounded track that sits behind a bar.
function makeTrack(w: number, h: number, radius: number): RectangleNode {
  const track = figma.createRectangle();
  track.name = 'Track';
  track.resize(w, h);
  track.fills = [solidFill(TOKENS.black5)];
  track.cornerRadius = radius;
  return track;
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

