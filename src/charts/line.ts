import { GenerateChartPayload, LineChartOptions } from '../types';
import { TOKENS, CHART, CHART_PALETTE, TEXT, solidFill, hexToRGB, formatTick } from '../styles/tokens';
import { buildXAxisConfig } from './xAxis';
import { buildLegend } from './legend';

interface Point { x: number; y: number; }

export async function createLineChart(payload: GenerateChartPayload): Promise<FrameNode> {
  await figma.loadFontAsync({ family: TEXT.FONT_FAMILY, style: 'Regular' });

  const { data, xField, yFields, colors, lineOptions } = payload;
  const opts: LineChartOptions = lineOptions;
  const palette = colors.length > 0 ? colors : CHART_PALETTE;

  const yLabelFrameW = opts.yAxisLabel ? CHART.Y_LABEL_FRAME_W : 0;
  const yGroupGap    = opts.yAxisLabel ? 16 : 0;
  const yGroupW      = yLabelFrameW + yGroupGap + CHART.Y_AXIS_WIDTH;
  const canvasW = CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right - yGroupW;
  const canvasH = CHART.HEIGHT;

  // ── Compute X-axis labels before building any frames ──────────────────────
  const xAxisCfg = buildXAxisConfig(data, xField, canvasW);

  // Shared Y scale across all series
  const allY = yFields.flatMap(f => data.map(r => Number(r[f]) || 0));
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY, yMin + 1);

  // X normalisation
  const xVals    = data.map(r => Number(r[xField]));
  const numericX = xVals.every(v => !isNaN(v));
  const xMin     = numericX ? Math.min(...xVals) : 0;
  const xMax     = numericX ? Math.max(...xVals) : data.length - 1;
  const xRange   = xMax - xMin || 1;
  const yRange   = yMax - yMin || 1;

  function toPoint(row: typeof data[0], field: string, i: number): Point {
    const rawX = numericX ? Number(row[xField]) : i;
    const rawY = Number(row[field]) || 0;
    return {
      x: Math.round(((rawX - xMin) / xRange) * canvasW),
      y: Math.round(canvasH - ((rawY - yMin) / yRange) * canvasH),
    };
  }

  // ── Root ──────────────────────────────────────────────────────────────────
  const root = figma.createFrame();
  root.name = 'Line Chart';
  root.layoutMode = 'VERTICAL';
  root.primaryAxisSizingMode = 'FIXED';
  root.counterAxisSizingMode = 'AUTO';
  root.paddingTop    = CHART.MARGIN.top;    root.paddingBottom = CHART.MARGIN.bottom;
  root.paddingLeft   = CHART.MARGIN.left;   root.paddingRight  = CHART.MARGIN.right;
  root.itemSpacing   = 0;
  root.fills = [solidFill(TOKENS.white)];
  root.clipsContent = false;
  root.resize(
    CHART.WIDTH,
    canvasH + CHART.MARGIN.top + CHART.MARGIN.bottom + CHART.X_AXIS_HEIGHT + CHART.LEGEND_HEIGHT,
  );

  // ── Plot area ─────────────────────────────────────────────────────────────
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
    canvasH + CHART.X_AXIS_HEIGHT,
  );
  root.appendChild(plotArea);
  plotArea.layoutAlign = 'STRETCH';

  // ── Y Axis Group (label + ticks, horizontal auto layout) ─────────────────
  const yGroup = figma.createFrame();
  yGroup.name = 'Y Axis Group';
  yGroup.layoutMode = 'HORIZONTAL';
  yGroup.primaryAxisSizingMode = 'FIXED';
  yGroup.counterAxisSizingMode = 'FIXED';
  yGroup.counterAxisAlignItems = 'MIN';
  yGroup.itemSpacing = yGroupGap;
  yGroup.clipsContent = false;
  yGroup.fills = [];
  yGroup.resize(yGroupW, canvasH);
  plotArea.appendChild(yGroup);

  // ── Optional Y-axis label (rotated 90°, to the left of the tick labels) ────
  if (opts.yAxisLabel) {
    const yLabelFrame = figma.createFrame();
    yLabelFrame.name = 'Y Axis Label';
    yLabelFrame.layoutMode = 'NONE';
    yLabelFrame.clipsContent = false;
    yLabelFrame.fills = [];
    yLabelFrame.resize(yLabelFrameW, canvasH);

    const lbl = figma.createText();
    lbl.fontName = { family: TEXT.FONT_FAMILY, style: 'Regular' };
    lbl.fontSize = TEXT.TICK_SIZE;
    lbl.fills = [solidFill(TOKENS.black75)];
    lbl.characters = opts.yAxisLabel;
    lbl.textAlignHorizontal = 'CENTER';
    lbl.textAlignVertical = 'CENTER';
    const lblH = TEXT.TICK_SIZE + 4;
    lbl.resize(canvasH, lblH);
    lbl.x = (yLabelFrameW - lblH) / 2;
    lbl.y = canvasH;
    lbl.rotation = 90;
    yLabelFrame.appendChild(lbl);
    yGroup.appendChild(yLabelFrame);
  }

  // ── Y axis — absolute positioning so each label is centred exactly on its grid line
  const LABEL_BOX_H = 16; // px box height for a single 12px text line
  const yAxis = figma.createFrame();
  yAxis.name = 'Y Axis';
  yAxis.layoutMode = 'NONE';
  yAxis.clipsContent = false;
  yAxis.fills = [];
  yAxis.resize(CHART.Y_AXIS_WIDTH, canvasH);
  yGroup.appendChild(yAxis);

  for (let i = 0; i <= CHART.GRID_LINES; i++) {
    const v = yMax - (i / CHART.GRID_LINES) * yRange;
    const gridY = Math.round((i / CHART.GRID_LINES) * canvasH);
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

  // ── Canvas (absolute positioning) ────────────────────────────────────────
  const canvas = figma.createFrame();
  canvas.name = 'Canvas';
  canvas.layoutMode = 'NONE';
  canvas.fills = [solidFill(TOKENS.white)];
  canvas.clipsContent = false;
  canvas.resize(canvasW, canvasH + CHART.X_AXIS_HEIGHT);
  plotArea.appendChild(canvas);
  canvas.layoutGrow = 1;

  // ── Horizontal grid lines — dashed Black-25, baseline solid Black-50 ─────
  if (opts.showGridH) {
    for (let i = 0; i <= CHART.GRID_LINES; i++) {
      const y = Math.round((i / CHART.GRID_LINES) * canvasH);
      const isBaseline = i === CHART.GRID_LINES;
      const line = figma.createLine();
      line.name = isBaseline ? 'Baseline' : `Grid ${i}`;
      line.resize(canvasW, 0);
      line.x = 0; line.y = y;
      line.strokes      = [solidFill(isBaseline ? TOKENS.black50 : TOKENS.black25)];
      line.strokeWeight = 1;
      if (!isBaseline) line.dashPattern = [4, 4];
      line.constraints  = { horizontal: 'SCALE', vertical: 'SCALE' };
      canvas.appendChild(line);
    }
  } else {
    const baseline = figma.createLine();
    baseline.name = 'Baseline';
    baseline.resize(canvasW, 0);
    baseline.x = 0; baseline.y = canvasH - 1;
    baseline.strokes      = [solidFill(TOKENS.black50)];
    baseline.strokeWeight = 1;
    baseline.constraints  = { horizontal: 'SCALE', vertical: 'MIN' };
    canvas.appendChild(baseline);
  }

  // ── Per-series rendering ──────────────────────────────────────────────────
  yFields.forEach((field, si) => {
    const color = palette[si % palette.length];
    const pts   = data.map((row, i) => toPoint(row, field, i));

    if (opts.showArea) {
      const areaPath = buildAreaPath(pts, canvasH);
      const area = figma.createVector();
      area.name = `Area ${field}`;
      area.vectorPaths = [{ windingRule: 'NONZERO', data: areaPath }];
      const rgb = hexToRGB(color);
      area.fills  = [{ type: 'SOLID', color: rgb, opacity: 0.15 }];
      area.strokes = [];
      area.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
      canvas.appendChild(area);
    }

    const pathData = buildLinePath(pts, opts.curve);
    const vector = figma.createVector();
    vector.name = `Line ${field}`;
    vector.vectorPaths = [{ windingRule: 'NONE', data: pathData }];
    vector.fills       = [];
    vector.strokes     = [solidFill(color)];
    vector.strokeWeight = CHART.LINE_STROKE;
    vector.strokeCap    = 'ROUND';
    vector.strokeJoin   = 'ROUND';
    vector.constraints  = { horizontal: 'SCALE', vertical: 'SCALE' };
    canvas.appendChild(vector);

    if (opts.showMarkers) {
      const r = CHART.MARK_RADIUS;
      pts.forEach((pt, i) => {
        // Two near-zero-area vectors with round stroke caps render as fixed-size circles.
        // SCALE on a zero-width bounding box only moves the x position proportionally
        // without stretching the visual stroke — prevents circles becoming ellipses on resize.
        const dotOuter = figma.createVector();
        dotOuter.name = `Mark ${field} ${i} outer`;
        dotOuter.vectorPaths = [{ windingRule: 'NONZERO', data: 'M 0 0 L 0 0.01' }];
        dotOuter.strokes     = [solidFill(color)];
        dotOuter.strokeWeight = r * 2;
        dotOuter.strokeCap   = 'ROUND';
        dotOuter.fills       = [];
        dotOuter.x           = pt.x;
        dotOuter.y           = pt.y;
        dotOuter.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
        canvas.appendChild(dotOuter);

        const dotInner = figma.createVector();
        dotInner.name = `Mark ${field} ${i}`;
        dotInner.vectorPaths = [{ windingRule: 'NONZERO', data: 'M 0 0 L 0 0.01' }];
        dotInner.strokes     = [solidFill(TOKENS.white)];
        dotInner.strokeWeight = r * 2 - CHART.LINE_STROKE * 2;
        dotInner.strokeCap   = 'ROUND';
        dotInner.fills       = [];
        dotInner.x           = pt.x;
        dotInner.y           = pt.y;
        dotInner.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
        canvas.appendChild(dotInner);
      });
    }
  });

  // ── X axis labels + tick marks ────────────────────────────────────────────
  // pts0 gives the actual canvas x position for each data point
  const pts0 = data.map((row, i) => toPoint(row, yFields[0] ?? '', i));

  xAxisCfg.labels.forEach((lbl, i) => {
    if (!lbl.visible) return;

    const pt = pts0[i];

    // Tick mark — vertical vector so strokeWeight stays 1px when chart is resized
    const tick = figma.createVector();
    tick.name = `Tick ${i}`;
    tick.vectorPaths = [{ windingRule: 'NONZERO', data: 'M 0 0 L 0 4' }];
    tick.strokes = [solidFill(TOKENS.black50)];
    tick.strokeWeight = 1;
    tick.fills = [];
    tick.x = pt.x;
    tick.y = canvasH;
    tick.constraints = { horizontal: 'SCALE', vertical: 'MIN' };
    canvas.appendChild(tick);

    // Label text
    const t = figma.createText();
    t.name = `X Label ${i}`;
    t.fontName = { family: TEXT.FONT_FAMILY, style: 'Regular' };
    t.fontSize = TEXT.TICK_SIZE;
    t.fills = [solidFill(TOKENS.black75)];
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
    t.characters = lbl.text;
    t.textAlignHorizontal = 'CENTER';
    t.x = Math.round(pt.x - t.width / 2);
    t.y = canvasH + 6; // below the tick
    t.constraints = { horizontal: 'SCALE', vertical: 'MIN' };
    canvas.appendChild(t);
  });

  // ── Legend ──────────────────────────────────────────────────────────────────
  const innerW = CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right;
  const legend = buildLegend(yFields, palette, innerW, 'line');
  root.appendChild(legend);
  legend.layoutSizingHorizontal = 'FILL';

  return root;
}

// ── Path builders ─────────────────────────────────────────────────────────────

function buildLinePath(pts: Point[], curve: LineChartOptions['curve']): string {
  if (pts.length === 0) return '';
  if (curve === 'step')   return buildStepPath(pts);
  if (curve === 'smooth') return buildSmoothPath(pts);
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function buildStepPath(pts: Point[]): string {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` H ${pts[i].x} V ${pts[i].y}`;
  }
  return d;
}

// Catmull-Rom → cubic Bézier
function buildSmoothPath(pts: Point[]): string {
  if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M ${p[1].x} ${p[1].y}`;
  for (let i = 1; i < p.length - 2; i++) {
    const cp1x = +(p[i].x + (p[i + 1].x - p[i - 1].x) / 6).toFixed(2);
    const cp1y = +(p[i].y + (p[i + 1].y - p[i - 1].y) / 6).toFixed(2);
    const cp2x = +(p[i + 1].x - (p[i + 2].x - p[i].x) / 6).toFixed(2);
    const cp2y = +(p[i + 1].y - (p[i + 2].y - p[i].y) / 6).toFixed(2);
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p[i + 1].x} ${p[i + 1].y}`;
  }
  return d;
}

function buildAreaPath(pts: Point[], canvasH: number): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x} ${canvasH}`;
  pts.forEach(p => { d += ` L ${p.x} ${p.y}`; });
  d += ` L ${pts[pts.length - 1].x} ${canvasH} Z`;
  return d;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

