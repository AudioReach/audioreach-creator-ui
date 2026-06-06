/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import type {ContainerNode as ContainerNodeData} from '~features/usecase-visualizer/model/visualizer.types';
import {ContainerNode} from '~features/usecase-visualizer/ui/node-types/container-node';

import {makeContainerNodeProps} from './node-props';

function makeContainer(
  overrides: Partial<ContainerNodeData> = {},
): ContainerNodeData {
  return {
    containerId: 1,
    height: 120,
    id: 'container_C1_0',
    label: 'Container 1',
    logicalContainerId: 'lc-1',
    nodeKind: 'container',
    width: 200,
    x: 0,
    y: 0,
    ...overrides,
  };
}

function renderContainerNode(
  node: ContainerNodeData,
  setup?: (store: ReturnType<typeof createVisualizerStore>) => void,
) {
  const store = createVisualizerStore();
  setup?.(store);
  return render(
    <ReactFlowProvider>
      <VisualizerStoreProvider store={store}>
        <ContainerNode {...makeContainerNodeProps(node)} />
      </VisualizerStoreProvider>
    </ReactFlowProvider>,
  );
}

describe('ContainerNode — header', () => {
  it('renders the label', () => {
    renderContainerNode(makeContainer({label: 'DSP Container'}));
    expect(screen.getByTestId('container-node')).toHaveTextContent(
      'DSP Container',
    );
  });
});

describe('ContainerNode — ports', () => {
  it('renders no port handles', () => {
    const {container} = renderContainerNode(makeContainer());
    expect(container.querySelectorAll('[data-handleid]')).toHaveLength(0);
  });
});

describe('ContainerNode — hover highlight', () => {
  it('applies the highlight class when hovered logicalContainerId matches', () => {
    renderContainerNode(
      makeContainer({logicalContainerId: 'lc-1'}),
      (store) => {
        store.getState().setHoverState('other-node', 'lc-1');
      },
    );
    expect(screen.getByTestId('container-node').className).toContain(
      'container-hover-highlight',
    );
  });

  it('does not apply the highlight class when logicalContainerId differs', () => {
    renderContainerNode(
      makeContainer({logicalContainerId: 'lc-1'}),
      (store) => {
        store.getState().setHoverState('other-node', 'lc-2');
      },
    );
    expect(screen.getByTestId('container-node').className).not.toContain(
      'container-hover-highlight',
    );
  });

  it('does not apply the highlight class when no container is hovered', () => {
    renderContainerNode(makeContainer({logicalContainerId: 'lc-1'}));
    expect(screen.getByTestId('container-node').className).not.toContain(
      'container-hover-highlight',
    );
  });
});

describe('ContainerNode — nested hover (mouse leave guard)', () => {
  it('does not clear hover state on mouseLeave when a different node is hovered', () => {
    const store = createVisualizerStore();
    store.getState().setHoverState('other-node', 'lc-other');
    render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={store}>
          <ContainerNode
            {...makeContainerNodeProps(
              makeContainer({id: 'outer', logicalContainerId: 'lc-1'}),
            )}
          />
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );
    fireEvent.mouseLeave(screen.getByTestId('container-node'));
    const hover = store.getState().hoverState;
    expect(hover.hoveredNodeId).toBe('other-node');
    expect(hover.hoveredLogicalContainerId).toBe('lc-other');
  });

  it('clears hover state on mouseLeave when this node is the hovered one', () => {
    const store = createVisualizerStore();
    store.getState().setHoverState('outer', 'lc-1');
    render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={store}>
          <ContainerNode
            {...makeContainerNodeProps(
              makeContainer({id: 'outer', logicalContainerId: 'lc-1'}),
            )}
          />
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );
    fireEvent.mouseLeave(screen.getByTestId('container-node'));
    const hover = store.getState().hoverState;
    expect(hover.hoveredNodeId).toBeNull();
    expect(hover.hoveredLogicalContainerId).toBeNull();
  });
});
