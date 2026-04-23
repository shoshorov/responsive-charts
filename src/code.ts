/// <reference types="@figma/plugin-typings" />

import { UIToPluginMessage, PluginToUIMessage } from './types';
import { createBarChart } from './charts/bar';
import { createLineChart } from './charts/line';

declare const __html__: string;

figma.showUI(__html__, { width: 500, height: 700, title: 'Responsive Charts' });

figma.ui.onmessage = async (msg: UIToPluginMessage) => {
  if (msg.type !== 'generate-chart') return;

  try {
    const chart =
      msg.payload.chartType === 'bar'
        ? await createBarChart(msg.payload)
        : await createLineChart(msg.payload);

    figma.currentPage.appendChild(chart);
    figma.viewport.scrollAndZoomIntoView([chart]);

    const reply: PluginToUIMessage = { type: 'success' };
    figma.ui.postMessage(reply);
  } catch (err) {
    const reply: PluginToUIMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    figma.ui.postMessage(reply);
  }
};
