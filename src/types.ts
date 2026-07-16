export type ChartType = 'bar' | 'line' | 'pie';

export interface DataRow {
  [key: string]: string | number;
}

export interface BarChartOptions {
  layout: 'vertical' | 'horizontal';
  stacked: boolean;
  showBarLabels: boolean;
  borderRadius: number;
  showGridH: boolean;
  showGridV: boolean;
  yAxisLabel?: string;
}

export interface LineChartOptions {
  curve: 'linear' | 'smooth' | 'step';
  showArea: boolean;
  showMarkers: boolean;
  showGridH: boolean;
  yAxisLabel?: string;
}

export interface PieChartOptions {
  legendPosition: 'bottom' | 'left' | 'right';
  showValues: boolean;
}

export interface GenerateChartPayload {
  data: DataRow[];
  xField: string;
  yFields: string[];
  chartType: ChartType;
  colors: string[];
  barOptions: BarChartOptions;
  lineOptions: LineChartOptions;
  pieOptions?: PieChartOptions;
}

export type UIToPluginMessage =
  | { type: 'generate-chart'; payload: GenerateChartPayload };

export type PluginToUIMessage =
  | { type: 'success' }
  | { type: 'error'; message: string };
