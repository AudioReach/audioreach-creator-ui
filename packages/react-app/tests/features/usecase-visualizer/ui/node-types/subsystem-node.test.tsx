/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import type {SubsystemNode as SubsystemNodeData} from '~features/usecase-visualizer/model/visualizer.types';
import {SubsystemNode} from '~features/usecase-visualizer/ui/node-types/subsystem-node';

import {makeSubsystemNodeProps} from './node-props';

function makeSubsystem(
  overrides: Partial<SubsystemNodeData> = {},
): SubsystemNodeData {
  return {
    height: 120,
    id: 'sys-1',
    label: 'Subsystem A',
    nodeKind: 'subsystem',
    ports: [],
    subsystemId: 'sys-1',
    width: 200,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function renderSubsystemNode(node: SubsystemNodeData) {
  const store = createVisualizerStore();
  return render(
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <SubsystemNode {...makeSubsystemNodeProps(node)} />
      </VisualizerStoreProvider>
    </ReactFlowProvider>,
  );
}

describe('SubsystemNode — label', () => {
  it('renders the label', () => {
    renderSubsystemNode(makeSubsystem({label: 'Voice DSP'}));
    expect(screen.getByTestId('subsystem-node')).toHaveTextContent('Voice DSP');
  });
});

describe('SubsystemNode — port handles', () => {
  it('renders input, output, and control handles by handle id', () => {
    const node = makeSubsystem({
      ports: [
        {id: 'i1', portIoType: 'input'},
        {id: 'o1', portIoType: 'output'},
        {id: 'c1', portIoType: 'control'},
      ],
    });
    const {container} = renderSubsystemNode(node);

    const input = container.querySelector('[data-handleid="Data:i1"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute('data-handlepos')).toBe('left');

    const output = container.querySelector('[data-handleid="Data:o1"]');
    expect(output).not.toBeNull();
    expect(output?.getAttribute('data-handlepos')).toBe('right');

    const controlSource = container.querySelector(
      '[data-handleid="Control:c1-source"]',
    );
    const controlTarget = container.querySelector(
      '[data-handleid="Control:c1-target"]',
    );
    expect(controlSource).not.toBeNull();
    expect(controlTarget).not.toBeNull();
    expect(controlSource?.getAttribute('data-handlepos')).toBe('top');
    expect(controlTarget?.getAttribute('data-handlepos')).toBe('top');
  });
});

describe('SubsystemNode — selection styling', () => {
  it('applies info border and background when selected', () => {
    const {container} = render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={createVisualizerStore()}>
          <SubsystemNode
            {...makeSubsystemNodeProps(makeSubsystem(), {selected: true})}
          />
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );
    const node = container.querySelector(
      '[data-testid="subsystem-node"]',
    ) as HTMLElement;
    expect(node).toHaveClass('border-support-info');
    expect(node).toHaveClass('bg-support-info-subtle');
  });

  it('applies neutral border and background when not selected', () => {
    const {container} = renderSubsystemNode(makeSubsystem());
    const node = container.querySelector(
      '[data-testid="subsystem-node"]',
    ) as HTMLElement;
    expect(node).toHaveClass('border-neutral-10');
    expect(node).toHaveClass('bg-[var(--node-shade-medium)]');
  });
});

describe('SubsystemNode — even spacing', () => {
  it('places three input ports at 31, 50, 69 on a 100px-tall node with 12px padding', () => {
    const node = makeSubsystem({
      height: 100,
      ports: [
        {id: 'i1', portIoType: 'input'},
        {id: 'i2', portIoType: 'input'},
        {id: 'i3', portIoType: 'input'},
      ],
    });
    const {container} = renderSubsystemNode(node);
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

describe('SubsystemNode — fixed fill color, unaffected by link counts', () => {
  it('always applies the fixed base fill class, regardless of activeLinks/totalLinks', () => {
    const node = makeSubsystem({
      ports: [{activeLinks: 0, id: 'i1', portIoType: 'input', totalLinks: 5}],
    });
    const {container} = renderSubsystemNode(node);
    const handle = container.querySelector('[data-handleid="Data:i1"]');
    expect(handle?.className).toContain('bg-[var(--node-shade-strong)]');
    expect(handle?.className).not.toContain(
      'bg-[var(--color-background-neutral-00)]',
    );
    expect(handle?.className).not.toContain(
      'bg-[var(--color-background-neutral-10)]',
    );
  });
});
