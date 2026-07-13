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
  root.resize(CHART.WIDTH, 300);

  // Stacked bar visualization
  const bar = figma.createFrame();
  bar.name = 'Stacked Bar';
  bar.layoutMode = 'HORIZONTAL';
  bar.primaryAxisSizingMode = 'FIXED';
  bar.counterAxisSizingMode = 'FIXED';
  bar.itemSpacing = 0;
  bar.fills = [];
  bar.resize(innerW, 40);
  root.appendChild(bar);

  // Draw segments
  slices.forEach((slice, idx) => {
    if (slice.value === 0) return;
    const proportion = slice.value / totalValue;
    const segmentW = innerW * proportion;

    const segment = figma.createRectangle();
    segment.name = `Segment: ${slice.label}`;
    segment.resize(segmentW, 40);
    segment.fills = [solidFill(palette[idx % palette.length])];
    segment.strokes = [solidFill(TOKENS.white)];
    segment.strokeWeight = 1;

    bar.appendChild(segment);
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
  // Compute pie data
  const slices = data.map(row => ({
    label: String(row[xField] || ''),
    value: yFields.reduce((sum, f) => sum + (Number(row[f]) || 0), 0),
  }));

  const totalValue = slices.reduce((sum, s) => sum + s.value, 0);
  const innerW = CHART.WIDTH - CHART.MARGIN.left - CHART.MARGIN.right;

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
  root.itemSpacing = 24;
  root.counterAxisAlignItems = 'MIN';
  root.fills = [solidFill(TOKENS.white)];
  root.resize(CHART.WIDTH, 280);

  // Legend on left
  const legend = buildPieLegendVertical(slices, palette, 140);
  root.appendChild(legend);

  // Stacked vertical bar on right
  const barContainer = figma.createFrame();
  barContainer.name = 'Bar Container';
  barContainer.layoutMode = 'VERTICAL';
  barContainer.primaryAxisSizingMode = 'FIXED';
  barContainer.counterAxisSizingMode = 'FIXED';
  barContainer.itemSpacing = 0;
  barContainer.fills = [];
  barContainer.resize(innerW - 140 - 24, 200);
  root.appendChild(barContainer);

  // Draw segments (stacked vertically for left layout)
  slices.forEach((slice, idx) => {
    if (slice.value === 0) return;
    const proportion = slice.value / totalValue;
    const segmentH = 200 * proportion;

    const segment = figma.createRectangle();
    segment.name = `Segment: ${slice.label}`;
    segment.resize(innerW - 140 - 24, segmentH);
    segment.fills = [solidFill(palette[idx % palette.length])];
    segment.strokes = [solidFill(TOKENS.white)];
    segment.strokeWeight = 1;

    barContainer.appendChild(segment);
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
