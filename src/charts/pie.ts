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
  root.primaryAxisSizingMode = 'FIXED';
  root.counterAxisSizingMode = 'AUTO';
  root.paddingTop = CHART.MARGIN.top;
  root.paddingBottom = CHART.MARGIN.bottom;
  root.paddingLeft = CHART.MARGIN.left;
  root.paddingRight = CHART.MARGIN.right;
  root.itemSpacing = 20;
  root.fills = [solidFill(TOKENS.white)];
  root.resize(CHART.WIDTH, 380);

  // Pie circle container
  const pieContainer = figma.createFrame();
  pieContainer.name = 'Pie Circle';
  pieContainer.layoutMode = 'NONE';
  pieContainer.fills = [];
  pieContainer.resize(diameter, diameter);
  root.appendChild(pieContainer);

  const centerX = radius;
  const centerY = radius;

  // Outer circle
  const outerCircle = figma.createEllipse();
  outerCircle.name = 'Outer Circle';
  outerCircle.resize(diameter, diameter);
  outerCircle.fills = [];
  outerCircle.strokes = [solidFill(TOKENS.black15)];
  outerCircle.strokeWeight = 1;
  pieContainer.appendChild(outerCircle);

  // Draw radial lines (spokes) for each slice
  let startAngle = 0;
  slices.forEach((slice, idx) => {
    if (slice.value === 0) return;
    const proportion = slice.value / totalValue;
    const angle = proportion * 360;
    const midAngle = startAngle + angle / 2;
    const rad = midAngle * (Math.PI / 180);

    // Draw line from center outward
    const lineLen = radius;
    const lineW = Math.max(2, Math.ceil(angle / 30));

    const line = figma.createRectangle();
    line.name = `Line: ${slice.label}`;
    line.resize(lineW, lineLen);
    line.fills = [solidFill(palette[idx % palette.length])];
    line.strokes = [];

    // Position center at pie center
    line.x = centerX - lineW / 2;
    line.y = centerY - lineLen;
    line.rotation = midAngle;

    pieContainer.appendChild(line);

    startAngle += angle;
  });

  // Inner circle (cover center)
  const innerCircle = figma.createEllipse();
  innerCircle.name = 'Inner Circle';
  innerCircle.resize(radius * 0.35, radius * 0.35);
  innerCircle.fills = [solidFill(TOKENS.white)];
  innerCircle.strokes = [solidFill(TOKENS.black15)];
  innerCircle.strokeWeight = 1;
  innerCircle.x = centerX - (radius * 0.35) / 2;
  innerCircle.y = centerY - (radius * 0.35) / 2;
  pieContainer.appendChild(innerCircle);

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
  root.primaryAxisSizingMode = 'FIXED';
  root.counterAxisSizingMode = 'AUTO';
  root.paddingTop = CHART.MARGIN.top;
  root.paddingBottom = CHART.MARGIN.bottom;
  root.paddingLeft = CHART.MARGIN.left;
  root.paddingRight = CHART.MARGIN.right;
  root.itemSpacing = 32;
  root.counterAxisAlignItems = 'CENTER';
  root.fills = [solidFill(TOKENS.white)];
  root.resize(CHART.WIDTH, Math.max(diameter + CHART.MARGIN.top + CHART.MARGIN.bottom, 320));

  // Legend on left
  const legend = buildPieLegendVertical(slices, palette, 160);
  root.appendChild(legend);

  // Pie circle container on right
  const pieContainer = figma.createFrame();
  pieContainer.name = 'Pie Circle';
  pieContainer.layoutMode = 'NONE';
  pieContainer.fills = [];
  pieContainer.resize(diameter, diameter);
  root.appendChild(pieContainer);

  const centerX = radius;
  const centerY = radius;

  // Outer circle
  const outerCircle = figma.createEllipse();
  outerCircle.name = 'Outer Circle';
  outerCircle.resize(diameter, diameter);
  outerCircle.fills = [];
  outerCircle.strokes = [solidFill(TOKENS.black15)];
  outerCircle.strokeWeight = 1;
  pieContainer.appendChild(outerCircle);

  // Draw radial lines (spokes) for each slice
  let startAngle = 0;
  slices.forEach((slice, idx) => {
    if (slice.value === 0) return;
    const proportion = slice.value / totalValue;
    const angle = proportion * 360;
    const midAngle = startAngle + angle / 2;
    const rad = midAngle * (Math.PI / 180);

    // Draw line from center outward
    const lineLen = radius;
    const lineW = Math.max(2, Math.ceil(angle / 30));

    const line = figma.createRectangle();
    line.name = `Line: ${slice.label}`;
    line.resize(lineW, lineLen);
    line.fills = [solidFill(palette[idx % palette.length])];
    line.strokes = [];

    // Position center at pie center
    line.x = centerX - lineW / 2;
    line.y = centerY - lineLen;
    line.rotation = midAngle;

    pieContainer.appendChild(line);

    startAngle += angle;
  });

  // Inner circle (cover center)
  const innerCircle = figma.createEllipse();
  innerCircle.name = 'Inner Circle';
  innerCircle.resize(radius * 0.35, radius * 0.35);
  innerCircle.fills = [solidFill(TOKENS.white)];
  innerCircle.strokes = [solidFill(TOKENS.black15)];
  innerCircle.strokeWeight = 1;
  innerCircle.x = centerX - (radius * 0.35) / 2;
  innerCircle.y = centerY - (radius * 0.35) / 2;
  pieContainer.appendChild(innerCircle);

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
