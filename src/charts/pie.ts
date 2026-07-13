import { GenerateChartPayload, PieChartOptions } from '../types';
import { TOKENS, CHART, TEXT, solidFill } from '../styles/tokens';

export async function createPieChart(payload: GenerateChartPayload): Promise<FrameNode> {
  await figma.loadFontAsync({ family: TEXT.FONT_FAMILY, style: 'Regular' });

  const { data, xField, yFields, colors, pieOptions } = payload;
  const opts: PieChartOptions = pieOptions || { legendPosition: 'bottom', showLabels: false };
  const palette = colors.length > 0 ? colors : [
    TOKENS.blueVibrant,
    TOKENS.greenVibrant,
    TOKENS.yellowVibrant,
    TOKENS.orangeVibrant,
    TOKENS.redVibrant,
    TOKENS.purpleVibrant,
  ];

  return opts.legendPosition === 'left'
    ? buildPieChartWithLeftLegend(data, xField, yFields, palette, opts)
    : buildPieChartWithBottomLegend(data, xField, yFields, palette, opts);
}

function buildPieChartWithBottomLegend(
  data: GenerateChartPayload['data'],
  xField: string,
  yFields: string[],
  palette: string[],
  opts: PieChartOptions,
): FrameNode {
  const pieRadius = 60;
  const pieDiameter = pieRadius * 2;
  const innerW = CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right;

  // Compute pie data: label + value per row
  const slices = data.map(row => ({
    label: String(row[xField] || ''),
    value: yFields.reduce((sum, f) => sum + (Number(row[f]) || 0), 0),
  }));

  const totalValue = slices.reduce((sum, s) => sum + s.value, 0);

  // Root vertical layout
  const root = figma.createFrame();
  root.name = 'Pie Chart';
  root.layoutMode = 'VERTICAL';
  root.primaryAxisSizingMode = 'FIXED';
  root.counterAxisSizingMode = 'AUTO';
  root.paddingTop = CHART.MARGIN.top;
  root.paddingBottom = CHART.MARGIN.bottom;
  root.paddingLeft = CHART.MARGIN.left;
  root.paddingRight = CHART.MARGIN.right;
  root.itemSpacing = 20;
  root.fills = [solidFill(TOKENS.white)];
  root.resize(CHART.WIDTH, 400);

  // Pie container
  const pieContainer = figma.createFrame();
  pieContainer.name = 'Pie Container';
  pieContainer.layoutMode = 'NONE';
  pieContainer.clipsContent = false;
  pieContainer.fills = [];
  pieContainer.resize(pieDiameter, pieDiameter);
  root.appendChild(pieContainer);

  // Draw pie slices using concentric circles with segments
  let startAngle = 0;
  slices.forEach((slice, idx) => {
    if (slice.value === 0) return;
    const percentage = slice.value / totalValue;
    const angle = percentage * 360;
    const color = palette[idx % palette.length];

    drawPieSegment(pieContainer, startAngle, angle, color, pieRadius);
    startAngle += angle;
  });

  // Legend below
  const legend = buildPieLegend(slices, palette, innerW);
  root.appendChild(legend);
  legend.layoutAlign = 'STRETCH';

  return root;
}

function buildPieChartWithLeftLegend(
  data: GenerateChartPayload['data'],
  xField: string,
  yFields: string[],
  palette: string[],
  opts: PieChartOptions,
): FrameNode {
  const pieRadius = 60;
  const pieDiameter = pieRadius * 2;

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
  root.primaryAxisSizingMode = 'FIXED';
  root.counterAxisSizingMode = 'AUTO';
  root.paddingTop = CHART.MARGIN.top;
  root.paddingBottom = CHART.MARGIN.bottom;
  root.paddingLeft = CHART.MARGIN.left;
  root.paddingRight = CHART.MARGIN.right;
  root.itemSpacing = 32;
  root.counterAxisAlignItems = 'CENTER';
  root.fills = [solidFill(TOKENS.white)];
  const totalW = 180 + 32 + pieDiameter + CHART.MARGIN.left + CHART.MARGIN.right;
  root.resize(totalW, Math.max(pieDiameter + CHART.MARGIN.top + CHART.MARGIN.bottom, 280));

  // Legend on left
  const legend = buildPieLegendVertical(slices, palette, 160);
  root.appendChild(legend);

  // Pie container on right
  const pieContainer = figma.createFrame();
  pieContainer.name = 'Pie Container';
  pieContainer.layoutMode = 'NONE';
  pieContainer.clipsContent = false;
  pieContainer.fills = [];
  pieContainer.resize(pieDiameter, pieDiameter);
  root.appendChild(pieContainer);

  // Draw pie slices
  let startAngle = 0;
  slices.forEach((slice, idx) => {
    if (slice.value === 0) return;
    const percentage = slice.value / totalValue;
    const angle = percentage * 360;
    const color = palette[idx % palette.length];

    drawPieSegment(pieContainer, startAngle, angle, color, pieRadius);

    startAngle += angle;
  });

  return root;
}

function drawPieSegment(
  container: FrameNode,
  startAngle: number,
  angle: number,
  color: string,
  radius: number,
): void {
  if (angle === 0) return;

  const centerX = radius;
  const centerY = radius;
  const diameter = radius * 2;

  // Draw pie segment as stacked trapezoid-like shapes (approximate wedge)
  // Create visual wedge by stacking thin rotated rectangles
  const numStacks = Math.max(4, Math.ceil(radius / 15));
  const stackThickness = radius / numStacks;

  for (let i = 0; i < numStacks; i++) {
    // Rectangle width increases with distance from center (trapezoid effect)
    const innerR = i * stackThickness;
    const outerR = (i + 1) * stackThickness;
    const avgR = (innerR + outerR) / 2;

    // Width of arc segment at average radius
    const arcWidth = (avgR * angle * Math.PI) / 180;
    const rectH = stackThickness - 1;

    const rect = figma.createRectangle();
    rect.name = `Stack ${i}`;
    rect.resize(Math.max(2, arcWidth), Math.max(1, rectH));
    rect.fills = [solidFill(color)];
    rect.strokes = [solidFill(TOKENS.white)];
    rect.strokeWeight = 0.5;

    // Position at the midpoint of the arc segment
    const midAngle = startAngle + angle / 2;
    const rad = midAngle * (Math.PI / 180);
    const posX = centerX + avgR * Math.cos(rad);
    const posY = centerY + avgR * Math.sin(rad);

    rect.x = posX - Math.max(2, arcWidth) / 2;
    rect.y = posY - Math.max(1, rectH) / 2;
    rect.rotation = midAngle;

    container.appendChild(rect);
  }
}

function buildPieLegend(
  slices: Array<{ label: string; value: number }>,
  palette: string[],
  width: number,
): FrameNode {
  const legend = figma.createFrame();
  legend.name = 'Legend';
  legend.layoutMode = 'HORIZONTAL';
  legend.primaryAxisSizingMode = 'FIXED';
  legend.counterAxisSizingMode = 'AUTO';
  legend.primaryAxisAlignItems = 'CENTER';
  legend.counterAxisAlignItems = 'CENTER';
  legend.layoutWrap = 'WRAP';
  legend.itemSpacing = 16;
  legend.counterAxisSpacing = 6;
  legend.fills = [];
  legend.resize(width, 40);

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
  legend.primaryAxisSizingMode = 'FIXED';
  legend.counterAxisSizingMode = 'AUTO';
  legend.primaryAxisAlignItems = 'MIN';
  legend.counterAxisAlignItems = 'MIN';
  legend.itemSpacing = 8;
  legend.fills = [];
  legend.resize(width, 400);

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
