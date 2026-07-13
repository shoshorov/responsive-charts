import { GenerateChartPayload, PieChartOptions } from '../types';
import { TOKENS, CHART, CHART_PALETTE, TEXT, solidFill } from '../styles/tokens';

export async function createPieChart(payload: GenerateChartPayload): Promise<FrameNode> {
  await figma.loadFontAsync({ family: TEXT.FONT_FAMILY, style: 'Regular' });

  const { data, xField, yFields, pieOptions } = payload;
  const opts: PieChartOptions = pieOptions || { legendPosition: 'bottom', showLabels: false };
  // Pie slices come from data rows (one per category), not yFields — so the
  // yField-scoped `colors` array doesn't apply. Always cycle the full palette
  // so each slice gets a distinct colour.
  const palette = CHART_PALETTE;

  // Build pie as stacked horizontal bar with legend
  return opts.legendPosition === 'left'
    ? buildPieWithLeftLegend(data, xField, yFields, palette)
    : buildPieWithBottomLegend(data, xField, yFields, palette);
}

function buildPieWithBottomLegend(
  data: GenerateChartPayload['data'],
  xField: string,
  yFields: string[],
  palette: string[],
): FrameNode {
  const innerW = CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right;
  const radius = 70;
  const diameter = radius * 2;

  // Compute pie data
  const slices = data.map(row => ({
    label: String(row[xField] || ''),
    value: yFields.reduce((sum, f) => sum + (Number(row[f]) || 0), 0),
  }));

  const totalValue = slices.reduce((sum, s) => sum + s.value, 0);

  // Root vertical layout
  const root = figma.createFrame();
  root.name = 'Pie Chart';
  root.layoutMode = 'VERTICAL';
  root.primaryAxisSizingMode = 'AUTO';
  root.counterAxisSizingMode = 'AUTO';
  root.paddingTop = CHART.MARGIN.top;
  root.paddingBottom = CHART.MARGIN.bottom;
  root.paddingLeft = CHART.MARGIN.left;
  root.paddingRight = CHART.MARGIN.right;
  root.itemSpacing = 20;
  root.primaryAxisAlignItems = 'CENTER';
  root.fills = [solidFill(TOKENS.white)];

  // Pie circle container
  const pieContainer = figma.createFrame();
  pieContainer.name = 'Pie Circle';
  pieContainer.layoutMode = 'NONE';
  pieContainer.fills = [];
  pieContainer.resize(diameter, diameter);
  pieContainer.clipsContent = false;
  root.appendChild(pieContainer);

  // Draw pie slices using arc ellipses
  let startAngle = 0;
  let colorIdx = 0;
  slices.forEach((slice) => {
    if (slice.value === 0) return;
    const proportion = slice.value / totalValue;
    const sweepAngle = proportion * 360;
    const endAngle = startAngle + sweepAngle;

    const arc = figma.createEllipse();
    arc.name = `Slice: ${slice.label}`;
    arc.resize(diameter, diameter);
    arc.fills = [solidFill(palette[colorIdx % palette.length])];
    arc.strokes = [solidFill(TOKENS.white)];
    arc.strokeWeight = 2;

    // Set arc properties
    arc.arcData = {
      startingAngle: (startAngle * Math.PI) / 180,
      endingAngle: (endAngle * Math.PI) / 180,
      innerRadius: 0.45,
    };

    pieContainer.appendChild(arc);
    // Scale with the container so the pie is resizable
    arc.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    startAngle = endAngle;
    colorIdx += 1;
  });

  // Legend below
  const legend = buildPieLegend(slices, palette, innerW);
  root.appendChild(legend);
  legend.layoutAlign = 'STRETCH';

  return root;
}

function buildPieWithLeftLegend(
  data: GenerateChartPayload['data'],
  xField: string,
  yFields: string[],
  palette: string[],
): FrameNode {
  const radius = 70;
  const diameter = radius * 2;

  // Compute pie data
  const slices = data.map(row => ({
    label: String(row[xField] || ''),
    value: yFields.reduce((sum, f) => sum + (Number(row[f]) || 0), 0),
  }));

  const totalValue = slices.reduce((sum, s) => sum + s.value, 0);

  // Root horizontal layout
  const root = figma.createFrame();
  root.name = 'Pie Chart';
  root.layoutMode = 'HORIZONTAL';
  root.primaryAxisSizingMode = 'AUTO';
  root.counterAxisSizingMode = 'AUTO';
  root.paddingTop = CHART.MARGIN.top;
  root.paddingBottom = CHART.MARGIN.bottom;
  root.paddingLeft = CHART.MARGIN.left;
  root.paddingRight = CHART.MARGIN.right;
  root.itemSpacing = 32;
  root.counterAxisAlignItems = 'CENTER';
  root.fills = [solidFill(TOKENS.white)];

  // Legend on left
  const legend = buildPieLegendVertical(slices, palette, 160);
  root.appendChild(legend);

  // Pie circle container on right
  const pieContainer = figma.createFrame();
  pieContainer.name = 'Pie Circle';
  pieContainer.layoutMode = 'NONE';
  pieContainer.fills = [];
  pieContainer.resize(diameter, diameter);
  pieContainer.clipsContent = false;
  root.appendChild(pieContainer);

  // Draw pie slices using arc ellipses
  let startAngle = 0;
  let colorIdx = 0;
  slices.forEach((slice) => {
    if (slice.value === 0) return;
    const proportion = slice.value / totalValue;
    const sweepAngle = proportion * 360;
    const endAngle = startAngle + sweepAngle;

    const arc = figma.createEllipse();
    arc.name = `Slice: ${slice.label}`;
    arc.resize(diameter, diameter);
    arc.fills = [solidFill(palette[colorIdx % palette.length])];
    arc.strokes = [solidFill(TOKENS.white)];
    arc.strokeWeight = 2;

    // Set arc properties
    arc.arcData = {
      startingAngle: (startAngle * Math.PI) / 180,
      endingAngle: (endAngle * Math.PI) / 180,
      innerRadius: 0.45,
    };

    pieContainer.appendChild(arc);
    // Scale with the container so the pie is resizable
    arc.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
    startAngle = endAngle;
    colorIdx += 1;
  });

  return root;
}

function buildPieLegend(
  slices: Array<{ label: string; value: number }>,
  palette: string[],
  width: number,
): FrameNode {
  const legend = figma.createFrame();
  legend.name = 'Legend';
  legend.layoutMode = 'HORIZONTAL';
  legend.primaryAxisSizingMode = 'AUTO';
  legend.counterAxisSizingMode = 'AUTO';
  legend.primaryAxisAlignItems = 'CENTER';
  legend.counterAxisAlignItems = 'CENTER';
  legend.layoutWrap = 'WRAP';
  legend.itemSpacing = 16;
  legend.counterAxisSpacing = 6;
  legend.fills = [];

  slices.forEach((slice, idx) => {
    const color = palette[idx % palette.length];

    const item = figma.createFrame();
    item.name = `Legend: ${slice.label}`;
    item.layoutMode = 'HORIZONTAL';
    item.primaryAxisSizingMode = 'AUTO';
    item.counterAxisSizingMode = 'AUTO';
    item.counterAxisAlignItems = 'CENTER';
    item.itemSpacing = 6;
    item.fills = [];

    const square = figma.createRectangle();
    square.name = 'Indicator';
    square.resize(10, 10);
    square.fills = [solidFill(color)];
    square.cornerRadius = 2;
    item.appendChild(square);

    const label = figma.createText();
    label.name = 'Label';
    label.fontName = { family: TEXT.FONT_FAMILY, style: 'Regular' };
    label.fontSize = TEXT.TICK_SIZE;
    label.fills = [solidFill(TOKENS.black75)];
    label.characters = slice.label;

    item.appendChild(label);
    legend.appendChild(item);
  });

  return legend;
}

function buildPieLegendVertical(
  slices: Array<{ label: string; value: number }>,
  palette: string[],
  width: number,
): FrameNode {
  const legend = figma.createFrame();
  legend.name = 'Legend';
  legend.layoutMode = 'VERTICAL';
  legend.primaryAxisSizingMode = 'AUTO';
  legend.counterAxisSizingMode = 'AUTO';
  legend.primaryAxisAlignItems = 'MIN';
  legend.counterAxisAlignItems = 'MIN';
  legend.itemSpacing = 8;
  legend.fills = [];

  slices.forEach((slice, idx) => {
    const color = palette[idx % palette.length];

    const item = figma.createFrame();
    item.name = `Legend: ${slice.label}`;
    item.layoutMode = 'HORIZONTAL';
    item.primaryAxisSizingMode = 'AUTO';
    item.counterAxisSizingMode = 'AUTO';
    item.counterAxisAlignItems = 'CENTER';
    item.itemSpacing = 6;
    item.fills = [];

    const square = figma.createRectangle();
    square.name = 'Indicator';
    square.resize(10, 10);
    square.fills = [solidFill(color)];
    square.cornerRadius = 2;
    item.appendChild(square);

    const label = figma.createText();
    label.name = 'Label';
    label.fontName = { family: TEXT.FONT_FAMILY, style: 'Regular' };
    label.fontSize = TEXT.TICK_SIZE;
    label.fills = [solidFill(TOKENS.black75)];
    label.characters = slice.label;

    item.appendChild(label);
    legend.appendChild(item);
  });

  return legend;
}
