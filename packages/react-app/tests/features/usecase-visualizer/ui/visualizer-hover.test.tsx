/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {fireEvent, render, screen} from '@testing-library/react';
import {ReactFlowProvider} from '@xyflow/react';

import {createVisualizerStore} from '~features/usecase-visualizer/model/usecase-visualizer-store';
import {VisualizerStoreProvider} from '~features/usecase-visualizer/model/visualizer-store-context';
import type {ContainerNode as ContainerNodeData} from '~features/usecase-visualizer/model/visualizer.types';
import {ContainerNode} from '~features/usecase-visualizer/ui/node-types/container-node';

import {makeContainerNodeProps} from './node-types/node-props';

function makeContainer(
  overrides: Partial<ContainerNodeData> = {},
): ContainerNodeData {
  return {
    containerId: 1,
    height: 120,
    id: 'c1',
    label: 'Container',
    logicalContainerId: 'lc-1',
    nodeKind: 'container',
    width: 200,
    x: 0,
    y: 0,
    ...overrides,
  };
}

describe('multi-instance logicalContainerId highlight', () => {
  it('highlights every ContainerNode sharing the hovered logicalContainerId', () => {
    const store = createVisualizerStore();
    render(
      <ReactFlowProvider>
        <VisualizerStoreProvider store={store}>
          <div data-testid="a">
            <ContainerNode
              {...makeContainerNodeProps(
                makeContainer({id: 'inst-a', logicalContainerId: 'lc-1'}),
              )}
            />
          </div>
          <div data-testid="b">
            <ContainerNode
              {...makeContainerNodeProps(
                makeContainer({id: 'inst-b', logicalContainerId: 'lc-1'}),
              )}
            />
          </div>
          <div data-testid="c">
            <ContainerNode
              {...makeContainerNodeProps(
                makeContainer({id: 'inst-c', logicalContainerId: 'lc-2'}),
              )}
            />
          </div>
        </VisualizerStoreProvider>
      </ReactFlowProvider>,
    );

    const [a, b, c] = screen.getAllByTestId('container-node');
    fireEvent.mouseEnter(a);

    expect(a.className).toContain('container-hover-highlight');
    expect(b.className).toContain('container-hover-highlight');
    expect(c.className).not.toContain('container-hover-highlight');
  });
});
