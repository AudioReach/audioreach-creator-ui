/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Node} from '@xyflow/react';

import {NODE_KIND, type AnyNode} from '~entities/graph';
import {resolveDropTarget} from '~features/usecase-visualizer/lib/drop-target';

function makeNode(
  data: AnyNode,
  position: {x: number; y: number},
  size: {height: number; width: number},
  parentId?: string,
): Node {
  return {
    data: data as AnyNode & Record<string, unknown>,
    height: size.height,
    id: data.id,
    parentId,
    position,
    width: size.width,
  };
}

describe('resolveDropTarget', () => {
  it('resolves a nested container using absolute bounds and target metadata', () => {
    const subgraph = makeNode(
      {
        height: 300,
        id: 'subgraph-sg-1',
        label: 'SG',
        meta: {subgraphSystemId: 'sg-1'},
        nodeKind: NODE_KIND.SUBGRAPH,
        subgraphId: Number.NaN,
        width: 400,
        x: 0,
        y: 0,
      },
      {x: 100, y: 200},
      {height: 300, width: 400},
    );
    const container = makeNode(
      {
        containerId: Number.NaN,
        height: 200,
        id: 'container-c-1:sg-1',
        label: 'Container',
        meta: {containerSystemId: 'c-1', subgraphSystemId: 'sg-1'},
        nodeKind: NODE_KIND.CONTAINER,
        width: 300,
        x: 0,
        y: 0,
      },
      {x: 30, y: 40},
      {height: 200, width: 300},
      'subgraph-sg-1',
    );

    expect(resolveDropTarget({x: 150, y: 260}, [subgraph, container])).toEqual({
      position: {x: 20, y: 20},
      targetContainerId: 'c-1',
      targetSubgraphId: 'sg-1',
    });
  });

  it('falls back to the canvas position when no drop target contains the point', () => {
    expect(resolveDropTarget({x: 500, y: 600}, [])).toEqual({
      position: {x: 500, y: 600},
    });
  });
});
