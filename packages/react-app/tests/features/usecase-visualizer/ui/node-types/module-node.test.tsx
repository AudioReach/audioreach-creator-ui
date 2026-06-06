/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import type {
  AnyNode,
  ModuleNode as ModuleNodeData,
  NodeContentOverride,
  NodeDisplayConfig,
} from '~features/usecase-visualizer/model/visualizer.types';
import {ModuleNode} from '~features/usecase-visualizer/ui/node-types/module-node';

import {makeModuleNodeProps} from './node-props';

function makeModule(overrides: Partial<ModuleNodeData> = {}): ModuleNodeData {
  return {
    height: 100,
    id: 'm-1',
    label: 'Gain',
    moduleId: 42,
    moduleType: 'GAIN',
    nodeKind: 'module',
    ports: [],
    width: 160,
    x: 0,
    y: 0,
    ...overrides,
  };
}

interface RenderOptions {
  nodeDisplayConfig?: NodeDisplayConfig;
  renderNodeContent?: (node: AnyNode) => NodeContentOverride | null;
}

function renderModuleNode(node: ModuleNodeData, options: RenderOptions = {}) {
  const store = createVisualizerStore();
  if (options.nodeDisplayConfig || options.renderNodeContent) {
    store.getState().setRenderingConfig({
      ...(options.nodeDisplayConfig
        ? {nodeDisplayConfig: options.nodeDisplayConfig}
        : {}),
      ...(options.renderNodeContent
        ? {renderNodeContent: options.renderNodeContent}
        : {}),
    });
  }
  return render(
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <ModuleNode {...makeModuleNodeProps(node)} />
      </VisualizerStoreProvider>
    </ReactFlowProvider>,
  );
}

describe('ModuleNode — default footer', () => {
  it('renders label and #moduleId by default', () => {
    renderModuleNode(makeModule({label: 'Gain', moduleId: 42}));
    const footer = screen.getByTestId('module-default-footer');
    expect(footer).toHaveTextContent('Gain');
    expect(footer).toHaveTextContent('#42');
  });

  it('uses alias instead of label when alias is set', () => {
    renderModuleNode(makeModule({alias: 'OutGain', label: 'Gain'}));
    const footer = screen.getByTestId('module-default-footer');
    expect(footer).toHaveTextContent('OutGain');
  });

  it('hides #moduleId when nodeDisplayConfig.showModuleInstanceId is false', () => {
    renderModuleNode(makeModule({moduleId: 99}), {
      nodeDisplayConfig: {showModuleInstanceId: false},
    });
    expect(screen.queryByTestId('module-instance-id')).not.toBeInTheDocument();
    expect(screen.getByTestId('module-default-footer')).toHaveTextContent(
      'Gain',
    );
  });
});

describe('ModuleNode — custom footer', () => {
  it('renders renderNodeContent footer instead of default', () => {
    renderModuleNode(makeModule(), {
      renderNodeContent: () => ({
        footer: <div data-testid="custom-footer">CUSTOM</div>,
      }),
    });
    expect(screen.getByTestId('custom-footer')).toBeInTheDocument();
    expect(
      screen.queryByTestId('module-default-footer'),
    ).not.toBeInTheDocument();
  });
});

describe('ModuleNode — coreOverrides', () => {
  it('renders content at all four corners', () => {
    renderModuleNode(makeModule(), {
      renderNodeContent: () => ({
        coreOverrides: [
          {
            content: <span data-testid="ov-tl">TL</span>,
            position: 'top-left',
          },
          {
            content: <span data-testid="ov-tr">TR</span>,
            position: 'top-right',
          },
          {
            content: <span data-testid="ov-bl">BL</span>,
            position: 'bottom-left',
          },
          {
            content: <span data-testid="ov-br">BR</span>,
            position: 'bottom-right',
          },
        ],
      }),
    });
    expect(screen.getByTestId('core-override-top-left')).toContainElement(
      screen.getByTestId('ov-tl'),
    );
    expect(screen.getByTestId('core-override-top-right')).toContainElement(
      screen.getByTestId('ov-tr'),
    );
    expect(screen.getByTestId('core-override-bottom-left')).toContainElement(
      screen.getByTestId('ov-bl'),
    );
    expect(screen.getByTestId('core-override-bottom-right')).toContainElement(
      screen.getByTestId('ov-br'),
    );
  });
});

describe('ModuleNode — port handles', () => {
  it('renders one target Handle per data input on the left', () => {
    const node = makeModule({
      ports: [
        {id: 'i1', portIoType: 'input'},
        {id: 'i2', portIoType: 'input'},
      ],
    });
    const {container} = renderModuleNode(node);
    const inputs = container.querySelectorAll(
      '.react-flow__handle-left[data-handleid^="Data:"]',
    );
    expect(inputs).toHaveLength(2);
    const ids = Array.from(inputs)
      .map((h) => h.getAttribute('data-handleid'))
      .sort();
    expect(ids).toEqual(['Data:i1', 'Data:i2']);
    inputs.forEach((h) => {
      expect(h.getAttribute('data-handlepos')).toBe('left');
    });
  });

  it('renders one source Handle per data output on the right', () => {
    const node = makeModule({
      ports: [{id: 'o1', portIoType: 'output'}],
    });
    const {container} = renderModuleNode(node);
    const out = container.querySelector('[data-handleid="Data:o1"]');
    expect(out).not.toBeNull();
    expect(out?.getAttribute('data-handlepos')).toBe('right');
  });

  it('renders TWO Handles per control port on top', () => {
    const node = makeModule({
      ports: [{id: 'c1', portIoType: 'control'}],
    });
    const {container} = renderModuleNode(node);
    const source = container.querySelector(
      '[data-handleid="Control:c1-source"]',
    );
    const target = container.querySelector(
      '[data-handleid="Control:c1-target"]',
    );
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();
    expect(source?.getAttribute('data-handlepos')).toBe('top');
    expect(target?.getAttribute('data-handlepos')).toBe('top');
  });
});

describe('ModuleNode — port status class', () => {
  it('applies port-status-${status} class when portStatus set', () => {
    const node = makeModule({
      ports: [{id: 'i1', portIoType: 'input', portStatus: 'used'}],
    });
    const {container} = renderModuleNode(node);
    const handle = container.querySelector('[data-handleid="Data:i1"]');
    expect(handle?.className).toContain('port-status-used');
  });

  it('does not apply any port-status class when portStatus is undefined', () => {
    const node = makeModule({
      ports: [{id: 'i1', portIoType: 'input'}],
    });
    const {container} = renderModuleNode(node);
    const handle = container.querySelector('[data-handleid="Data:i1"]');
    expect(handle?.className).not.toMatch(/port-status-/);
  });
});

describe('ModuleNode — shape class', () => {
  it('defaults to module-shape-rect when shape is unset', () => {
    renderModuleNode(makeModule());
    const root = screen.getByTestId('module-node');
    expect(root.className).toContain('module-shape-rect');
    expect(root.getAttribute('data-shape')).toBe('rect');
  });

  it('applies module-shape-${shape} for every shape', () => {
    const shapes = [
      'rect',
      'circle',
      'trapezoid-source',
      'trapezoid-sink',
      'triangle',
    ] as const;
    for (const shape of shapes) {
      const {unmount} = renderModuleNode(makeModule({shape}));
      const root = screen.getByTestId('module-node');
      expect(root.className).toContain(`module-shape-${shape}`);
      unmount();
    }
  });
});

describe('ModuleNode — locked', () => {
  it('disables connection on handles when node is locked', () => {
    const node = makeModule({
      locked: true,
      ports: [
        {id: 'i1', portIoType: 'input'},
        {id: 'c1', portIoType: 'control'},
      ],
    });
    const {container} = renderModuleNode(node);
    container.querySelectorAll('[data-handleid]').forEach((h) => {
      expect(h.classList.contains('connectable')).toBe(false);
    });
    const root = screen.getByTestId('module-node');
    expect(root.getAttribute('data-locked')).toBe('true');
  });

  it('does not lock handles when node is not locked', () => {
    const node = makeModule({
      ports: [{id: 'i1', portIoType: 'input'}],
    });
    const {container} = renderModuleNode(node);
    const handle = container.querySelector('[data-handleid="Data:i1"]');
    expect(handle).not.toBeNull();
    expect(screen.getByTestId('module-node').getAttribute('data-locked')).toBe(
      null,
    );
  });
});

describe('ModuleNode — even spacing', () => {
  it('places three input ports at 31, 50, 69 on a 100px-tall node with 12px padding', () => {
    const node = makeModule({
      height: 100,
      ports: [
        {id: 'i1', portIoType: 'input'},
        {id: 'i2', portIoType: 'input'},
        {id: 'i3', portIoType: 'input'},
      ],
    });
    const {container} = renderModuleNode(node);
    const handles = Array.from(
      container.querySelectorAll<HTMLElement>(
        '[data-handleid^="Data:i"][data-handlepos="left"]',
      ),
    ).sort((a, b) => {
      const ai = a.getAttribute('data-handleid') ?? '';
      const bi = b.getAttribute('data-handleid') ?? '';
      return ai.localeCompare(bi);
    });
    expect(handles).toHaveLength(3);
    const tops = handles.map((h) => h.style.top);
    expect(tops).toEqual(['31px', '50px', '69px']);
  });
});
