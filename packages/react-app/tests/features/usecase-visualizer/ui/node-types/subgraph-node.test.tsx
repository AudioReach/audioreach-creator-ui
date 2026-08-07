/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import type {
  AnyNode,
  NodeContentOverride,
  NodeDisplayConfig,
  SubgraphNode as SubgraphNodeData,
  VisualizerEventHandlers,
} from '~features/usecase-visualizer/model/visualizer.types';
import {SubgraphNode} from '~features/usecase-visualizer/ui/node-types/subgraph-node';

import {makeSubgraphNodeProps} from './node-props';

function makeSubgraph(
  overrides: Partial<SubgraphNodeData> = {},
): SubgraphNodeData {
  return {
    height: 200,
    id: 'sg-1',
    label: 'My Subgraph',
    nodeKind: 'subgraph',
    subgraphId: 7,
    width: 300,
    x: 0,
    y: 0,
    ...overrides,
  };
}

interface RenderOptions {
  eventHandlers?: VisualizerEventHandlers;
  nodeDisplayConfig?: NodeDisplayConfig;
  renderNodeContent?: (node: AnyNode) => NodeContentOverride | null;
}

function renderSubgraphNode(
  node: SubgraphNodeData,
  options: RenderOptions = {},
) {
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
  if (options.eventHandlers) {
    store.getState().setEventHandlers(options.eventHandlers);
  }
  return render(
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <SubgraphNode {...makeSubgraphNodeProps(node)} />
      </VisualizerStoreProvider>
    </ReactFlowProvider>,
  );
}

describe('SubgraphNode — header', () => {
  it('renders the label', () => {
    renderSubgraphNode(makeSubgraph({label: 'Audio SG'}));
    expect(screen.getByTestId('subgraph-header')).toHaveTextContent('Audio SG');
  });

  it('does not render the collapse toggle when onSubgraphCollapse is not wired', () => {
    renderSubgraphNode(makeSubgraph({label: 'Audio SG'}));
    expect(
      screen.queryByRole('button', {name: /collapse subgraph/i}),
    ).not.toBeInTheDocument();
  });

  it('renders the collapse toggle when onSubgraphCollapse is wired', () => {
    renderSubgraphNode(makeSubgraph({label: 'Audio SG'}), {
      eventHandlers: {onSubgraphCollapse: jest.fn()},
    });
    expect(
      screen.getByRole('button', {name: /collapse subgraph/i}),
    ).toBeInTheDocument();
  });

  it('renders renderNodeContent header between label and toggle', () => {
    renderSubgraphNode(makeSubgraph({label: 'Audio SG'}), {
      eventHandlers: {onSubgraphCollapse: jest.fn()},
      renderNodeContent: () => ({
        header: <div data-testid="custom-header">CTRL</div>,
      }),
    });
    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
    expect(screen.getByTestId('subgraph-header')).toHaveTextContent('Audio SG');
    expect(
      screen.getByRole('button', {name: /collapse subgraph/i}),
    ).toBeInTheDocument();
  });

  it('renders the header slot between the label and the chevron button', () => {
    renderSubgraphNode(makeSubgraph({label: 'Audio SG'}), {
      eventHandlers: {onSubgraphCollapse: jest.fn()},
      renderNodeContent: () => ({
        header: <div data-testid="custom-header">CTRL</div>,
      }),
    });
    const slot = screen.getByTestId('subgraph-header-slot');
    const chevron = screen.getByRole('button', {name: /collapse subgraph/i});
    const labelSpan = screen.getByTestId('subgraph-header').firstElementChild;
    expect(labelSpan).not.toBeNull();
    const FOLLOWING = 0x04;
    expect(
      (labelSpan as Element).compareDocumentPosition(slot) & FOLLOWING,
    ).toBeTruthy();
    expect(slot.compareDocumentPosition(chevron) & FOLLOWING).toBeTruthy();
  });

  it('does not render the header slot when override.header is absent', () => {
    renderSubgraphNode(makeSubgraph());
    expect(
      screen.queryByTestId('subgraph-header-slot'),
    ).not.toBeInTheDocument();
  });

  it('groups the header slot with the title, left of the collapse button', () => {
    renderSubgraphNode(makeSubgraph({label: 'Audio SG'}), {
      eventHandlers: {onSubgraphCollapse: jest.fn()},
      renderNodeContent: () => ({
        header: <div data-testid="ckv-slot">CKV</div>,
      }),
    });
    const header = screen.getByTestId('subgraph-header');
    const titleGroup = screen.getByTestId('subgraph-header-title-group');
    const slot = screen.getByTestId('subgraph-header-slot');
    // The slot lives inside the left title group, not as a centered sibling
    // of the header row.
    expect(titleGroup).toContainElement(slot);
    expect(header.children).toHaveLength(2); // title group + collapse button
  });
});

describe('SubgraphNode — collapse toggle', () => {
  it('calls onSubgraphCollapse with the subgraphId when clicked', () => {
    const onSubgraphCollapse = jest.fn();
    renderSubgraphNode(makeSubgraph({subgraphId: 42}), {
      eventHandlers: {onSubgraphCollapse},
    });
    fireEvent.click(screen.getByRole('button', {name: /collapse subgraph/i}));
    expect(onSubgraphCollapse).toHaveBeenCalledWith(42);
  });
});

describe('SubgraphNode — selection styling', () => {
  it('applies info border and background when selected', () => {
    const {getByTestId} = render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={createVisualizerStore()}>
          <SubgraphNode
            {...makeSubgraphNodeProps(makeSubgraph(), {selected: true})}
          />
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );
    const node = getByTestId('subgraph-node');
    expect(node.style.borderColor).toContain('--color-border-support-info');
    expect(node.style.backgroundColor).toContain(
      '--color-background-support-info-subtle',
    );
  });

  it('applies neutral border when not selected', () => {
    const {getByTestId} = renderSubgraphNode(makeSubgraph());
    expect(getByTestId('subgraph-node').style.borderColor).toContain(
      '--color-border-neutral-10',
    );
  });
});

describe('SubgraphNode — showSubgraphId', () => {
  it('renders the subgraph id by default', () => {
    renderSubgraphNode(makeSubgraph({subgraphId: 7}));
    expect(screen.getByTestId('subgraph-id')).toHaveTextContent('#0x00000007');
  });

  it('hides the subgraph id when showSubgraphId is false', () => {
    renderSubgraphNode(makeSubgraph(), {
      nodeDisplayConfig: {showSubgraphId: false},
    });
    expect(screen.queryByTestId('subgraph-id')).not.toBeInTheDocument();
  });
});
