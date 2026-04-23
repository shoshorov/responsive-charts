# Responsive Charts

A Figma plugin that generates polished, data-driven bar and line charts directly on your canvas from CSV data.

## Features

- **Two chart types** — vertical/horizontal bar charts and line charts with multiple curve styles
- **CSV import** — drag-and-drop, file picker, or paste raw CSV
- **Auto-detection** — automatically identifies numeric columns for Y-axes and time-based columns for X-axes
- **Multiple series** — plot several numeric columns simultaneously, each with its own colour
- **Customisation** — grid lines, bar border radius, area fill, data point markers, curve interpolation (linear / smooth / step)
- **Guided workflow** — 4-step wizard takes you from data to chart in seconds

## Installation

1. Open Figma and go to **Plugins → Development → Import plugin from manifest**
2. Select the `manifest.json` file from this repository
3. Run the plugin from **Plugins → Responsive Charts**

## Development

### Prerequisites

- Node.js ≥ 18
- npm

### Setup

```bash
npm install
```

### Build

```bash
# Production build
npm run build

# Development build
npm run build:dev

# Watch mode (rebuilds on file changes)
npm run watch
```

Build output is written to `dist/`. Load the plugin in Figma via the `manifest.json` in the project root.

## Usage

1. **Upload data** — drag a CSV file onto the upload area, use the file picker, or paste raw CSV text
2. **Map fields** — select which column is the X-axis and which numeric columns to plot as series
3. **Choose chart type** — bar (vertical or horizontal) or line, then pick curve style and toggles
4. **Customise colours** — assign a colour from the palette to each series
5. Click **Generate** — the chart frame is inserted onto the active Figma page

## Project Structure

```
src/
├── code.ts          # Plugin entry point — handles Figma API calls
├── ui.ts            # 4-step wizard UI logic
├── ui.html          # UI markup and styles
├── types.ts         # Shared TypeScript types
├── charts/
│   ├── bar.ts       # Bar chart rendering
│   ├── line.ts      # Line chart rendering
│   ├── legend.ts    # Legend component
│   └── xAxis.ts     # X-axis with time-scale detection
├── parser/
│   └── csv.ts       # CSV parsing (PapaParse)
└── styles/
    └── tokens.ts    # Design tokens and colour palette
```

## Tech Stack

- **TypeScript** — plugin and UI code
- **Webpack** — bundles and inlines scripts into a single HTML file
- **PapaParse** — robust CSV parsing
- **Figma Plugin API** — canvas rendering

## License

MIT
