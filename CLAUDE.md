# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build       # production build (always use this to verify changes)
npm run build:dev   # development build (no minification)
npm run watch       # watch mode — rebuilds on file changes
```

There are no tests and no linter. The only verification step is a successful `npm run build`. Always build after making changes to confirm there are no TypeScript errors.

## Architecture

This is a Figma plugin with two separate JS contexts that cannot share runtime state:

- **`src/code.ts`** — runs inside Figma's sandbox, has access to `figma.*` API, no DOM. Receives a `generate-chart` message from the UI and calls the chart builders.
- **`src/ui.ts` + `src/ui.html`** — runs in a sandboxed iframe, has DOM but no `figma.*`. Implements the 4-step wizard. Communicates with `code.ts` via `parent.postMessage` / `figma.ui.onmessage`.

### Build pipeline

Webpack runs two configs in sequence (UI first, code second):
1. **UI bundle**: `ui.ts` → `ui.js` → inlined into `dist/ui.html` by `SpliceJsIntoHtml` (a custom webpack plugin in `webpack.config.js` — `html-inline-script-webpack-plugin` silently fails in production mode, hence the custom plugin).
2. **Code bundle**: `code.ts` → `dist/code.js`. The complete `dist/ui.html` is injected as `__html__` via `webpack.DefinePlugin` so `code.ts` can pass it to `figma.showUI(__html__)`.

### Chart rendering (`src/charts/`)

Each chart builder (`bar.ts`, `line.ts`) receives parsed data and options, creates a Figma frame tree, and returns the root `FrameNode`. All visual constants (sizes, colours, font) live in `src/styles/tokens.ts`.

`bar.ts` exports `createBarChart` which delegates to `buildVerticalBarChart` or `buildHorizontalBarChart`. Both support grouped and stacked modes (controlled by `BarChartOptions.stacked`). For stacked mode, `maxVal` is computed from per-row totals rather than individual field values.

`xAxis.ts` handles tick-label density (it culls labels when bars are too narrow) and detects time-scale columns.

### Figma API rules — critical ordering constraints

The Figma Plugin API enforces parent-child relationships at property assignment time, not at append time. **Any property that depends on the parent being an auto-layout frame must be set AFTER `parent.appendChild(node)`**, not before:

- `node.layoutPositioning = 'ABSOLUTE'` — requires parent with `layoutMode !== 'NONE'`
- `node.layoutSizingHorizontal = 'FILL'` — requires node to be in an auto-layout parent
- `node.layoutSizingVertical = 'FILL'` — same
- `node.layoutGrow = 1` — same
- `node.layoutAlign = 'STRETCH'` — same

**Correct pattern:**
```typescript
parent.appendChild(node);
node.layoutPositioning = 'ABSOLUTE';
node.x = ...; node.y = ...;  // also set x/y AFTER, since auto-layout overwrites them on append
```

Setting `x`/`y` coordinates for absolutely-positioned nodes must also happen after `layoutPositioning = 'ABSOLUTE'` is set, because the layout engine overwrites the node's position at append time.
