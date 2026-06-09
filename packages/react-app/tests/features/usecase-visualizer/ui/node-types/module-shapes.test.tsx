/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {NODE_DIMENSIONS} from '~features/usecase-visualizer';
import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import type {ModuleNode as ModuleNodeData} from '~features/usecase-visualizer/model/visualizer.types';
import {ModuleNode} from '~features/usecase-visualizer/ui/node-types/module-node';

import {makeModuleNodeProps} from './node-props';

jest.mock('~shared/lib/logger');

// Ports anchor to the visible shape box, which is the node height minus the
// external footer strip.
const boxHeight = (h: number): number =>
  h - NODE_DIMENSIONS.module.footerHeight;

function makeModule(overrides: Partial<ModuleNodeData> = {}): ModuleNodeData {
  return {
    height: 100,
    id: 'm-shape-1',
    label: 'ShapeTest',
    moduleId: 1,
    moduleType: 'TEST',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function renderModuleNode(node: ModuleNodeData) {
  const store = createVisualizerStore();
  return render(
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <ModuleNode {...makeModuleNodeProps(node)} />
      </VisualizerStoreProvider>
    </ReactFlowProvider>,
  );
}

describe('ModuleNode — outer wrapper', () => {
  it('data-shape="rect" when shape absent', () => {
    renderModuleNode(makeModule());
    expect(screen.getByTestId('module-node').getAttribute('data-shape')).toBe(
      'rect',
    );
  });

  it('data-shape="circle"', () => {
    renderModuleNode(makeModule({shape: 'circle'}));
    expect(screen.getByTestId('module-node').getAttribute('data-shape')).toBe(
      'circle',
    );
  });
});

describe('ModuleNode — shape layer clip-path classes', () => {
  it('rect: no clip-path class on shape layer', () => {
    renderModuleNode(makeModule());
    const layer = screen.getByTestId('module-shape-layer');
    expect(layer.className).not.toContain('clip-path');
  });

  it('circle: renders SVG shape outline, no clip-path class', () => {
    renderModuleNode(makeModule({shape: 'circle'}));
    const layer = screen.getByTestId('module-shape-layer');
    expect(layer.className).not.toContain('clip-path');
    expect(screen.getByTestId('module-shape-svg')).toBeInTheDocument();
  });

  it('trapezoid-source: renders SVG shape outline, no clip-path class', () => {
    renderModuleNode(makeModule({shape: 'trapezoid-source'}));
    const layer = screen.getByTestId('module-shape-layer');
    expect(layer.className).not.toContain('clip-path');
    expect(screen.getByTestId('module-shape-svg')).toBeInTheDocument();
  });

  it('trapezoid-sink: renders SVG shape outline, no clip-path class', () => {
    renderModuleNode(makeModule({shape: 'trapezoid-sink'}));
    const layer = screen.getByTestId('module-shape-layer');
    expect(layer.className).not.toContain('clip-path');
    expect(screen.getByTestId('module-shape-svg')).toBeInTheDocument();
  });

  it('triangle: renders SVG shape outline, no clip-path class', () => {
    renderModuleNode(makeModule({shape: 'triangle'}));
    const layer = screen.getByTestId('module-shape-layer');
    expect(layer.className).not.toContain('clip-path');
    expect(screen.getByTestId('module-shape-svg')).toBeInTheDocument();
  });
});

describe('ModuleNode — PortHandles are siblings of shape layer (not children)', () => {
  it('handles are outside the clipped shape layer', () => {
    const {container} = renderModuleNode(
      makeModule({ports: [{id: 'p1', portIoType: 'input'}]}),
    );
    const shapeLayer = screen.getByTestId('module-shape-layer');
    const handle = container.querySelector('[data-handleid]');
    expect(handle).not.toBeNull();
    expect(shapeLayer.contains(handle)).toBe(false);
    expect(screen.getByTestId('module-node').contains(handle)).toBe(true);
  });
});

describe('ModuleNode — handle placement by shape', () => {
  it('trapezoid-source: single output handle y is within inset range [0.15h, 0.85h]', () => {
    const H = 100;
    const node = makeModule({
      height: H,
      ports: [{id: 'o1', portIoType: 'output'}],
      shape: 'trapezoid-source',
    });
    const {container} = renderModuleNode(node);
    const handle = container.querySelector<HTMLElement>(
      '[data-handleid="Data:o1"]',
    );
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('data-handlepos')).toBe('right');
    const topPx = parseFloat(handle?.style.top ?? '0');
    expect(topPx).toBeGreaterThanOrEqual(boxHeight(H) * 0.15);
    expect(topPx).toBeLessThanOrEqual(boxHeight(H) * 0.85);
  });

  it('trapezoid-sink: single input handle y is within inset range [0.15h, 0.85h]', () => {
    const H = 100;
    const node = makeModule({
      height: H,
      ports: [{id: 'i1', portIoType: 'input'}],
      shape: 'trapezoid-sink',
    });
    const {container} = renderModuleNode(node);
    const handle = container.querySelector<HTMLElement>(
      '[data-handleid="Data:i1"]',
    );
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('data-handlepos')).toBe('left');
    const topPx = parseFloat(handle?.style.top ?? '0');
    expect(topPx).toBeGreaterThanOrEqual(boxHeight(H) * 0.15);
    expect(topPx).toBeLessThanOrEqual(boxHeight(H) * 0.85);
  });

  it('triangle: output handle is on the right and top = height/2', () => {
    const H = 80;
    const node = makeModule({
      height: H,
      ports: [{id: 'o1', portIoType: 'output'}],
      shape: 'triangle',
    });
    const {container} = renderModuleNode(node);
    const handle = container.querySelector<HTMLElement>(
      '[data-handleid="Data:o1"]',
    );
    expect(handle).not.toBeNull();
    expect(handle?.getAttribute('data-handlepos')).toBe('right');
    expect(handle?.style.top).toBe(`${boxHeight(H) / 2}px`);
  });

  it('circle: control port handle is centered (both left and top set)', () => {
    const node = makeModule({
      ports: [{id: 'c1', portIoType: 'control'}],
      shape: 'circle',
    });
    const {container} = renderModuleNode(node);
    const handles = container.querySelectorAll<HTMLElement>(
      '[data-handlepos="top"]',
    );
    expect(handles.length).toBeGreaterThan(0);
    for (const h of handles) {
      expect(h.style.left).toBeTruthy();
      expect(h.style.top).toBeTruthy();
    }
  });
});
