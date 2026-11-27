/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';

import type {LevelView} from '~entities/graph';
import {VISUALIZER_MODE} from '~features/usecase-visualizer/model/visualizer.types';
import {UsecaseVisualizer} from '~features/usecase-visualizer/ui/usecase-visualizer';

jest.mock('~shared/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
  },
}));

// jsdom lacks ResizeObserver; React Flow handles keyboard events.
beforeAll(() => {
  globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
  }));
});

const graph: LevelView = {
  levelId: 'root',
  subgraphs: [
    {
      height: 180,
      id: 'subgraph-1',
      label: 'Subgraph',
      meta: {systemId: 'sg-system-1'},
      nodeKind: 'subgraph',
      subgraphId: 1,
      width: 240,
      x: 0,
      y: 0,
    },
  ],
};

async function pressKey(key: string) {
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, {
      code: key,
      key,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    fireEvent.keyUp(document.activeElement ?? document.body, {code: key, key});
  });
}

async function selectSubgraph() {
  const node = await screen.findByTestId('rf__node-subgraph-1');
  fireEvent.pointerDown(node, {button: 0});
  fireEvent.click(node);
  await waitFor(() => expect(node).toHaveClass('selected'));
  return node;
}

describe('keyboard deletion with real React Flow', () => {
  it('dispatches Delete after mouse selection', async () => {
    const onNodesDeleted = jest
      .fn()
      .mockResolvedValue({deletedEdgeIds: [], deletedNodeIds: []});
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodesDeleted}}
        graph={graph}
        mode={VISUALIZER_MODE.EDIT}
      />,
    );
    await selectSubgraph();

    await pressKey('Delete');

    expect(onNodesDeleted).toHaveBeenCalledWith({nodeIds: ['sg-system-1']});
    expect(screen.getByTestId('rf__node-subgraph-1')).toBeInTheDocument();
  });

  it('keeps the graph unchanged on Backspace in read-only mode', async () => {
    const onNodesDeleted = jest.fn();
    render(
      <UsecaseVisualizer
        eventHandlers={{onNodesDeleted}}
        graph={graph}
        mode={VISUALIZER_MODE.READONLY}
      />,
    );
    await selectSubgraph();

    await pressKey('Backspace');

    expect(onNodesDeleted).not.toHaveBeenCalled();
    expect(screen.getByTestId('rf__node-subgraph-1')).toBeInTheDocument();
  });
});
