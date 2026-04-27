import Papa from 'papaparse';
import { CHART_PALETTE } from './styles/tokens';
import { detectScaleType } from './charts/xAxis';
import {
  DataRow, ChartType, UIToPluginMessage, PluginToUIMessage,
  BarChartOptions, LineChartOptions,
} from './types';

// ── State ─────────────────────────────────────────────────────────────────────

interface AppState {
  rows: DataRow[];
  headers: string[];
  numericHeaders: string[];
  timeHeaders: string[];           // columns detected as date/time scale
  chartType: ChartType | null;
  xField: string;
  yFields: string[];
  seriesColors: Record<string, string>;  // field → chosen color
  colors: string[];                // derived at payload time
  currentStep: number;
  completedSteps: Set<number>;
  barOptions: BarChartOptions;
  lineOptions: LineChartOptions;
}

const state: AppState = {
  rows: [], headers: [], numericHeaders: [], timeHeaders: [],
  chartType: null,
  xField: '', yFields: [],
  seriesColors: {},
  colors: [CHART_PALETTE[0]],
  currentStep: 1,
  completedSteps: new Set(),
  barOptions: {
    layout: 'vertical', stacked: false, showBarLabels: false,
    borderRadius: 0, showGridH: true, showGridV: false,
    yAxisLabel: '',
  },
  lineOptions: {
    curve: 'linear', showArea: false, showMarkers: true, showGridH: true,
    yAxisLabel: '',
  },
};

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

// ── Step management ───────────────────────────────────────────────────────────

function goToStep(n: number): void {
  // Only allow navigating to completed steps or the next step
  if (n > state.currentStep && !state.completedSteps.has(state.currentStep)) return;

  state.currentStep = n;

  // Update step content visibility
  [1, 2, 3, 4].forEach(i => {
    el(`step-${i}`).classList.toggle('active', i === n);
    const nav = el(`nav-${i}`);
    nav.classList.remove('active', 'done');
    if (i === n) nav.classList.add('active');
    else if (state.completedSteps.has(i)) nav.classList.add('done');
  });

  // Footer
  const backBtn = el<HTMLButtonElement>('back-btn');
  const nextBtn = el<HTMLButtonElement>('next-btn');
  const hint    = el('footer-hint');

  backBtn.style.visibility = n > 1 ? 'visible' : 'hidden';
  nextBtn.style.display = n === 4 ? 'none' : 'inline-flex';

  if (n === 1) hint.textContent = 'Upload a CSV file to continue';
  if (n === 2) hint.textContent = 'Pick a chart type';
  if (n === 3) hint.textContent = 'Map your data fields';
  if (n === 4) { hint.textContent = ''; nextBtn.style.display = 'none'; }

  updateNextBtn();
}

function updateNextBtn(): void {
  const btn = el<HTMLButtonElement>('next-btn');
  const s = state.currentStep;

  if (s === 1) btn.disabled = state.rows.length === 0;
  if (s === 2) btn.disabled = state.chartType === null;
  if (s === 3) btn.disabled = !state.xField || state.yFields.length === 0;
}

function completeStep(n: number): void {
  state.completedSteps.add(n);
  updateNextBtn();
}

// ── Step 1: File upload ───────────────────────────────────────────────────────

function initUploadZone(): void {
  const zone  = el('upload-zone');
  const input = el<HTMLInputElement>('file-input');

  // File input covers the zone — no programmatic .click() needed
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) loadFile(file);
  });

  // Paste fallback toggle
  el('paste-toggle').addEventListener('click', () => {
    el('paste-area').classList.toggle('hidden');
  });
  el('parse-paste-btn').addEventListener('click', () => {
    const text = el<HTMLTextAreaElement>('csv-paste').value.trim();
    if (text) processCSV(text, 'pasted-data.csv');
  });

  // Drag-and-drop — input captures these too, but handle zone for visual feedback
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer?.files[0];
    if (file) loadFile(file);
  });
}

function loadFile(file: File): void {
  const errEl = el('upload-err');
  errEl.classList.remove('show');

  // Show a "reading" state immediately so the user knows something is happening
  el('upload-title').textContent = 'Reading file…';

  readFileText(file)
    .then(text => processCSV(text, file.name))
    .catch(err => {
      errEl.textContent = `Could not read file: ${err instanceof Error ? err.message : String(err)}`;
      errEl.classList.add('show');
      el('upload-title').textContent = 'Upload CSV file';
    });
}

// Use Blob.text() (Chromium ≥ 76) — more reliable in sandboxed iframes than FileReader
function readFileText(file: File): Promise<string> {
  if (typeof (file as unknown as { text?: () => Promise<string> }).text === 'function') {
    return (file as unknown as { text: () => Promise<string> }).text();
  }
  // Fallback to FileReader
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsText(file, 'UTF-8');
  });
}

function processCSV(raw: string, filename: string): void {
  const text = raw.replace(/^\uFEFF/, ''); // strip BOM
  const errEl = el('upload-err');

  const result = Papa.parse<Record<string, string>>(text, {
    header: true, skipEmptyLines: true, dynamicTyping: false,
  });

  const headers = result.meta.fields ?? [];
  if (headers.length === 0 || result.data.length === 0) {
    errEl.textContent = 'No data found in file.';
    errEl.classList.add('show');
    return;
  }

  // Coerce values
  state.rows = result.data.map((row: Record<string, string>) => {
    const typed: DataRow = {};
    headers.forEach(h => { typed[h] = coerceValue(row[h] ?? ''); });
    return typed;
  });
  state.headers = headers;
  state.numericHeaders = headers.filter(h =>
    state.rows.slice(0, 20).every(r => {
      const v = r[h];
      return v !== '' && !isNaN(Number(v));
    })
  );

  // Detect columns whose values look like dates/time periods
  state.timeHeaders = headers.filter(h => {
    const sample = state.rows.slice(0, 20).map(r => String(r[h] ?? ''));
    return detectScaleType(sample) === 'time';
  });

  // Pre-select fields (time column preferred as X; overridden per chart type in step 3)
  const nonNumeric = headers.filter(h => !state.numericHeaders.includes(h));
  state.xField  = state.timeHeaders[0] ?? nonNumeric[0] ?? headers[0];
  state.yFields = state.numericHeaders.slice(0, 1);

  // Assign default color (blue) to every numeric series
  state.seriesColors = {};
  state.numericHeaders.forEach(h => { state.seriesColors[h] = CHART_PALETTE[0]; });

  // Update upload zone appearance
  const zone = el('upload-zone');
  zone.classList.add('has-file');
  el('upload-title').textContent = filename;
  el('upload-sub').textContent   = `${state.rows.length} rows · ${headers.length} columns`;

  // Show meta badges
  el('row-count').textContent = String(state.rows.length);
  el('col-count').textContent = String(headers.length);
  el('data-meta').classList.remove('hidden');

  // Render table
  renderPreviewTable();
  el('table-container').classList.remove('hidden');

  completeStep(1);
  updateNextBtn();
}

function renderPreviewTable(): void {
  const thead = el('preview-thead');
  const tbody = el('preview-tbody');
  const more  = el('table-more');
  const PREVIEW_ROWS = 6;

  // Header
  const tr = document.createElement('tr');
  state.headers.forEach(h => {
    const th = document.createElement('th');
    const isNum = state.numericHeaders.includes(h);
    th.innerHTML = `${h}<span class="col-type">${isNum ? '#' : 'Aa'}</span>`;
    tr.appendChild(th);
  });
  thead.innerHTML = '';
  thead.appendChild(tr);

  // Rows
  tbody.innerHTML = '';
  state.rows.slice(0, PREVIEW_ROWS).forEach(row => {
    const tr2 = document.createElement('tr');
    state.headers.forEach(h => {
      const td = document.createElement('td');
      td.textContent = String(row[h] ?? '');
      tr2.appendChild(td);
    });
    tbody.appendChild(tr2);
  });

  // More indicator
  if (state.rows.length > PREVIEW_ROWS) {
    more.textContent = `… and ${state.rows.length - PREVIEW_ROWS} more rows`;
    more.classList.remove('hidden');
  }
}

// ── Step 2: Chart type ────────────────────────────────────────────────────────

function initChartTypeCards(): void {
  ['bar', 'line'].forEach(type => {
    el(`card-${type}`).addEventListener('click', () => {
      state.chartType = type as ChartType;
      document.querySelectorAll('.chart-card').forEach(c => c.classList.remove('selected'));
      el(`card-${type}`).classList.add('selected');
      completeStep(2);
      updateNextBtn();
    });
  });
}

// ── Step 3: Field mapping ─────────────────────────────────────────────────────

function renderMappingStep(): void {
  // For line charts, auto-select the first detected time column as X axis
  if (state.chartType === 'line' && state.timeHeaders.length > 0) {
    state.xField = state.timeHeaders[0];
  }

  // X axis dropdown
  const xSel = el<HTMLSelectElement>('x-field');
  xSel.innerHTML = '';
  state.headers.forEach(h => xSel.appendChild(new Option(h, h)));
  xSel.value = state.xField;
  xSel.addEventListener('change', () => { state.xField = xSel.value; updateNextBtn(); });

  // Y series checkboxes (all numeric columns)
  const list = el('series-list');
  list.innerHTML = '';
  state.numericHeaders.forEach(h => {
    const color = state.seriesColors[h] ?? CHART_PALETTE[0];
    const isChecked = state.yFields.includes(h);

    const item = document.createElement('div');
    item.className = 'series-item' + (isChecked ? ' checked' : '');
    item.innerHTML = `
      <div class="series-cb">${isChecked ? checkSVG() : ''}</div>
      <div class="series-color" style="background:${color}"></div>
      <span class="series-name">${h}</span>
      <span class="series-type">#</span>
    `;
    item.addEventListener('click', () => {
      if (state.yFields.includes(h)) {
        state.yFields = state.yFields.filter(f => f !== h);
        item.classList.remove('checked');
        item.querySelector('.series-cb')!.innerHTML = '';
      } else {
        state.yFields.push(h);
        // Ensure a default color exists
        if (!state.seriesColors[h]) state.seriesColors[h] = CHART_PALETTE[0];
        item.classList.add('checked');
        item.querySelector('.series-cb')!.innerHTML = checkSVG();
      }
      el('series-err').classList.toggle('show', state.yFields.length === 0);
      updateNextBtn();
    });
    list.appendChild(item);
  });

  if (state.numericHeaders.length === 0) {
    list.innerHTML = '<p style="font-size:11px;color:var(--t3)">No numeric columns detected.</p>';
  }
}

function checkSVG(): string {
  return `<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ── Step 4: Customize ─────────────────────────────────────────────────────────

function renderCustomizeStep(): void {
  // Show/hide chart-specific options
  el('bar-options').classList.toggle('hidden',  state.chartType !== 'bar');
  el('line-options').classList.toggle('hidden', state.chartType !== 'line');

  // Per-series color pickers
  renderSeriesColors();
}

function renderSeriesColors(): void {
  const container = el('series-colors-list');
  container.innerHTML = '';

  state.yFields.forEach(field => {
    const currentColor = state.seriesColors[field] ?? CHART_PALETTE[0];

    const row = document.createElement('div');
    row.className = 'series-color-row';

    const nameEl = document.createElement('span');
    nameEl.className = 'series-color-name';
    nameEl.textContent = field;
    nameEl.title = field;
    row.appendChild(nameEl);

    const swatchRow = document.createElement('div');
    swatchRow.className = 'series-swatches';

    CHART_PALETTE.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'swatch' + (color === currentColor ? ' active' : '');
      swatch.style.background = color;
      swatch.title = color;
      swatch.addEventListener('click', () => {
        state.seriesColors[field] = color;
        swatchRow.querySelectorAll<HTMLElement>('.swatch')
          .forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
      swatchRow.appendChild(swatch);
    });

    row.appendChild(swatchRow);
    container.appendChild(row);
  });
}

// ── Toggle helper ─────────────────────────────────────────────────────────────

function initToggle(id: string, initial: boolean, onChange: (val: boolean) => void): void {
  const el2 = el(id);
  if (initial) el2.classList.add('on');
  else el2.classList.remove('on');
  el2.addEventListener('click', () => {
    const isOn = el2.classList.toggle('on');
    onChange(isOn);
  });
}

function initSegGroup(id: string, onChange: (val: string) => void): void {
  const group = el(id);
  group.querySelectorAll<HTMLButtonElement>('.seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.val ?? '');
    });
  });
}

function initRangeInput(rangeId: string, valId: string, onChange: (v: number) => void): void {
  const range = el<HTMLInputElement>(rangeId);
  const label = el(valId);
  range.addEventListener('input', () => {
    label.textContent = range.value;
    onChange(Number(range.value));
  });
}

// ── Generate ──────────────────────────────────────────────────────────────────

function initGenerateBtn(): void {
  el('generate-btn').addEventListener('click', () => {
    const btn = el<HTMLButtonElement>('generate-btn');
    btn.disabled = true;
    setStatus('Generating…', '');

    // Build colors array: one per yField, falling back to blue
    const colors = state.yFields.map(f => state.seriesColors[f] ?? CHART_PALETTE[0]);

    const msg: UIToPluginMessage = {
      type: 'generate-chart',
      payload: {
        data: state.rows,
        xField: state.xField,
        yFields: state.yFields,
        chartType: state.chartType!,
        colors,
        barOptions: { ...state.barOptions },
        lineOptions: { ...state.lineOptions },
      },
    };
    parent.postMessage({ pluginMessage: msg }, '*');
  });
}

function setStatus(msg: string, type: 'success' | 'error' | ''): void {
  const p = el('status-msg');
  p.textContent = msg;
  p.className = 'status' + (type ? ` ${type}` : '');
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function init(): void {
  initUploadZone();
  initChartTypeCards();

  // Nav clicks (only for completed steps)
  [1, 2, 3, 4].forEach(i => {
    el(`nav-${i}`).addEventListener('click', () => {
      if (state.completedSteps.has(i) || i === state.currentStep) return;
      if (i < state.currentStep) goToStep(i);
    });
  });

  // Next / Back
  el('next-btn').addEventListener('click', () => {
    if (el<HTMLButtonElement>('next-btn').disabled) return;
    const next = state.currentStep + 1;
    completeStep(state.currentStep);

    if (next === 3) renderMappingStep();
    if (next === 4) renderCustomizeStep();
    goToStep(next);
  });

  el('back-btn').addEventListener('click', () => {
    if (state.currentStep > 1) goToStep(state.currentStep - 1);
  });

  // Y-axis label (shared between both chart types)
  el<HTMLInputElement>('y-axis-label').addEventListener('input', e => {
    const val = (e.target as HTMLInputElement).value;
    state.barOptions.yAxisLabel  = val;
    state.lineOptions.yAxisLabel = val;
  });

  // Bar options
  initSegGroup('bar-layout',       v => { state.barOptions.layout = v as 'vertical' | 'horizontal'; });
  initToggle('toggle-bar-stacked', false, v => { state.barOptions.stacked = v; });
  initToggle('toggle-bar-labels',  false, v => { state.barOptions.showBarLabels = v; });
  initToggle('toggle-bar-grid-h', true,  v => { state.barOptions.showGridH = v; });
  initToggle('toggle-bar-grid-v', false, v => { state.barOptions.showGridV = v; });
  initRangeInput('bar-radius', 'bar-radius-val', v => { state.barOptions.borderRadius = v; });

  // Line options
  initSegGroup('line-curve',          v => { state.lineOptions.curve = v as 'linear' | 'smooth' | 'step'; });
  initToggle('toggle-line-area',    false, v => { state.lineOptions.showArea = v; });
  initToggle('toggle-line-markers', true,  v => { state.lineOptions.showMarkers = v; });
  initToggle('toggle-line-grid-h',  true,  v => { state.lineOptions.showGridH = v; });

  initGenerateBtn();
  goToStep(1);
}

// ── Plugin message receiver ───────────────────────────────────────────────────

window.onmessage = (event: MessageEvent) => {
  const msg = event.data?.pluginMessage as PluginToUIMessage | undefined;
  if (!msg) return;

  const btn = el<HTMLButtonElement>('generate-btn');
  btn.disabled = false;

  if (msg.type === 'success') setStatus('Chart created!', 'success');
  if (msg.type === 'error')   setStatus(`Error: ${msg.message}`, 'error');
};

// ── Utility ───────────────────────────────────────────────────────────────────

function coerceValue(raw: string): string | number {
  const trimmed = raw.trim().replace(/,/g, '');
  const num = Number(trimmed);
  return trimmed !== '' && !isNaN(num) ? num : raw.trim();
}

init();
