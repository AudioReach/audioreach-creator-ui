/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import type {
  SubgraphProxyNode as SubgraphProxyNodeData,
  VisualizerEventHandlers,
} from '~features/usecase-visualizer/model/visualizer.types';
import {SubgraphProxyNode} from '~features/usecase-visualizer/ui/node-types/subgraph-proxy-node';

import {makeSubgraphProxyNodeProps} from './node-props';

function makeProxy(
  overrides: Partial<SubgraphProxyNodeData> = {},
): SubgraphProxyNodeData {
  return {
    height: 60,
    id: 'proxy-1',
    label: 'Collapsed SG',
    nodeKind: 'subgraph-proxy',
    ports: [],
    subgraphId: 9,
    width: 160,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function renderProxyNode(
  node: SubgraphProxyNodeData,
  eventHandlers?: VisualizerEventHandlers,
) {
  const store = createVisualizerStore();
  if (eventHandlers) {
    store.getState().setEventHandlers(eventHandlers);
  }
  return render(
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <SubgraphProxyNode {...makeSubgraphProxyNodeProps(node)} />
      </VisualizerStoreProvider>
    </ReactFlowProvider>,
  );
}

describe('SubgraphProxyNode — label and border', () => {
  it('renders the label', () => {
    renderProxyNode(makeProxy({label: 'Collapsed SG'}));
    expect(screen.getByTestId('subgraph-proxy-node')).toHaveTextContent(
      'Collapsed SG',
    );
  });

  it('applies the dashed-border class', () => {
    renderProxyNode(makeProxy());
    expect(screen.getByTestId('subgraph-proxy-node').className).toContain(
      'border-dashed',
    );
  });
});

describe('SubgraphProxyNode — expand toggle', () => {
  it('renders an expand toggle', () => {
    renderProxyNode(makeProxy());
    expect(
      screen.getByRole('button', {name: /expand subgraph/i}),
    ).toBeInTheDocument();
  });

  it('calls onSubgraphExpand with the subgraphId when clicked', () => {
    const onSubgraphExpand = jest.fn();
    renderProxyNode(makeProxy({subgraphId: 9}), {onSubgraphExpand});
    fireEvent.click(screen.getByRole('button', {name: /expand subgraph/i}));
    expect(onSubgraphExpand).toHaveBeenCalledWith(9);
  });
});

describe('SubgraphProxyNode — port handles', () => {
  it('renders data and control handles per port', () => {
    const node = makeProxy({
      ports: [
        {id: 'i1', portIoType: 'input'},
        {id: 'o1', portIoType: 'output'},
        {id: 'c1', portIoType: 'control'},
      ],
    });
    const {container} = renderProxyNode(node);

    expect(container.querySelector('[data-handleid="Data:i1"]')).not.toBeNull();
    expect(container.querySelector('[data-handleid="Data:o1"]')).not.toBeNull();
    expect(
      container.querySelector('[data-handleid="Control:c1-source"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-handleid="Control:c1-target"]'),
    ).not.toBeNull();
  });
});

describe('SubgraphProxyNode — fixed fill color, unaffected by link counts', () => {
  it('always applies the fixed base fill class, regardless of activeLinks/totalLinks', () => {
    const node = makeProxy({
      ports: [{activeLinks: 0, id: 'i1', portIoType: 'input', totalLinks: 5}],
    });
    const {container} = renderProxyNode(node);
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
