/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render} from '@testing-library/react';
import {
  type ConnectionLineComponentProps,
  type InternalNode,
  Position,
} from '@xyflow/react';

import {getBoundaryAwareBezierPath} from '~features/usecase-visualizer/lib/edge-position';
import {BoundaryAwareConnectionLine} from '~features/usecase-visualizer/ui/edge-types/boundary-aware-connection-line';

function makeNode(type: string): InternalNode {
  return {type} as unknown as InternalNode;
}

function makeHandle(id: string): ConnectionLineComponentProps['fromHandle'] {
  return {
    height: 1,
    id,
    nodeId: 'n',
    position: Position.Right,
    type: 'source',
    width: 1,
  };
}

function makeProps(
  overrides: Partial<ConnectionLineComponentProps>,
): ConnectionLineComponentProps {
  const base: ConnectionLineComponentProps = {
    connectionLineType: 'default',
    connectionStatus: null,
    fromHandle: makeHandle('Data:in1'),
    fromNode: makeNode('module'),
    fromPosition: Position.Right,
    fromX: 0,
    fromY: 0,
    pointer: {x: -10, y: 0},
    toHandle: null,
    toNode: null,
    toPosition: Position.Right,
    toX: -10,
    toY: 0,
  };
  return {...base, ...overrides};
}

function renderPath(props: ConnectionLineComponentProps): string {
  const {container} = render(
    <svg>
      <BoundaryAwareConnectionLine {...props} />
    </svg>,
  );
  const path = container.querySelector('path');
  if (!path) {
    throw new Error('connection path not rendered');
  }
  const d = path.getAttribute('d');
  if (!d) {
    throw new Error('connection path has no d attribute');
  }
  return d;
}

describe('BoundaryAwareConnectionLine', () => {
  it('mirrors the source position when dragging from a boundary data handle', () => {
    const props = makeProps({
      fromHandle: makeHandle('Data:in1'),
      fromNode: makeNode('subsystem-boundary'),
      fromPosition: Position.Right,
      toHandle: makeHandle('Data:out1'),
      toNode: makeNode('module'),
      toPosition: Position.Right,
      toX: -10,
      toY: 0,
    });
    const [expectedPath] = getBoundaryAwareBezierPath({
      sourceIsBoundary: true,
      sourcePosition: Position.Left,
      sourceX: 0,
      sourceY: 0,
      targetIsBoundary: false,
      targetPosition: Position.Right,
      targetX: -10,
      targetY: 0,
    });
    expect(renderPath(props)).toBe(expectedPath);
  });

  it('mirrors the target position when hovering a boundary data handle', () => {
    const props = makeProps({
      fromHandle: makeHandle('Data:out1'),
      fromNode: makeNode('module'),
      fromPosition: Position.Right,
      toHandle: makeHandle('Data:in1'),
      toNode: makeNode('subsystem-boundary'),
      toPosition: Position.Right,
      toX: -10,
      toY: 0,
    });
    const [expectedPath] = getBoundaryAwareBezierPath({
      sourceIsBoundary: false,
      sourcePosition: Position.Right,
      sourceX: 0,
      sourceY: 0,
      targetIsBoundary: true,
      targetPosition: Position.Left,
      targetX: -10,
      targetY: 0,
    });
    expect(renderPath(props)).toBe(expectedPath);
  });

  it('does not mirror control connections even at a boundary node', () => {
    const props = makeProps({
      fromHandle: makeHandle('Control:in1-source'),
      fromNode: makeNode('subsystem-boundary'),
      fromPosition: Position.Right,
      toHandle: makeHandle('Control:out1-target'),
      toNode: makeNode('module'),
      toPosition: Position.Right,
      toX: -10,
      toY: 0,
    });
    const [expectedPath] = getBoundaryAwareBezierPath({
      sourceIsBoundary: false,
      sourcePosition: Position.Right,
      sourceX: 0,
      sourceY: 0,
      targetIsBoundary: false,
      targetPosition: Position.Right,
      targetX: -10,
      targetY: 0,
    });
    expect(renderPath(props)).toBe(expectedPath);
  });

  it('does not mirror the target when dragging over empty canvas', () => {
    const props = makeProps({
      fromHandle: makeHandle('Data:in1'),
      fromNode: makeNode('subsystem-boundary'),
      fromPosition: Position.Right,
      toHandle: null,
      toNode: null,
      toPosition: Position.Right,
      toX: -10,
      toY: 0,
    });
    const [expectedPath] = getBoundaryAwareBezierPath({
      sourceIsBoundary: true,
      sourcePosition: Position.Left,
      sourceX: 0,
      sourceY: 0,
      targetIsBoundary: false,
      targetPosition: Position.Right,
      targetX: -10,
      targetY: 0,
    });
    expect(renderPath(props)).toBe(expectedPath);
  });
});
