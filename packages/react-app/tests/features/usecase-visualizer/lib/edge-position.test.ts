/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {getBezierPath, Position} from '@xyflow/react';

import {
  getBoundaryAwareBezierPath,
  resolveDataEdgePositions,
} from '~features/usecase-visualizer/lib/edge-position';

describe('resolveDataEdgePositions', () => {
  const endpoints = {
    source: 'm1',
    sourcePosition: Position.Right,
    target: 'm2',
    targetPosition: Position.Left,
  };

  it('returns positions unchanged when there is no boundary', () => {
    expect(resolveDataEdgePositions(endpoints, undefined)).toEqual({
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  it('returns positions unchanged when neither endpoint is the boundary', () => {
    expect(resolveDataEdgePositions(endpoints, 'ss-1')).toEqual({
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  it('mirrors the target position when the target is the boundary', () => {
    expect(
      resolveDataEdgePositions({...endpoints, target: 'ss-1'}, 'ss-1'),
    ).toEqual({
      sourcePosition: Position.Right,
      targetPosition: Position.Right,
    });
  });

  it('mirrors the source position when the source is the boundary', () => {
    expect(
      resolveDataEdgePositions({...endpoints, source: 'ss-1'}, 'ss-1'),
    ).toEqual({
      sourcePosition: Position.Left,
      targetPosition: Position.Left,
    });
  });

  it('mirrors Top/Bottom positions symmetrically', () => {
    expect(
      resolveDataEdgePositions(
        {
          source: 'ss-1',
          sourcePosition: Position.Top,
          target: 'm2',
          targetPosition: Position.Bottom,
        },
        'ss-1',
      ),
    ).toEqual({
      sourcePosition: Position.Bottom,
      targetPosition: Position.Bottom,
    });
  });
});

describe('getBoundaryAwareBezierPath', () => {
  it('matches getBezierPath exactly when neither endpoint is a boundary', () => {
    const params = {
      sourcePosition: Position.Right,
      sourceX: 0,
      sourceY: 0,
      targetPosition: Position.Left,
      targetX: 100,
      targetY: 100,
    };
    const [expectedPath, expectedLabelX, expectedLabelY] = getBezierPath(
      params,
    );
    expect(getBoundaryAwareBezierPath(params)).toEqual([
      expectedPath,
      expectedLabelX,
      expectedLabelY,
    ]);
  });

  it('floors the control offset only at the boundary endpoint when the gap is small', () => {
    const [path, labelX] = getBoundaryAwareBezierPath({
      sourceIsBoundary: true,
      sourcePosition: Position.Left,
      sourceX: 0,
      sourceY: 0,
      targetIsBoundary: false,
      targetPosition: Position.Right,
      targetX: -10,
      targetY: 0,
    });
    // Boundary endpoint: 0.5 * 10 = 5 would hug the port; floored to 48.
    // Non-boundary endpoint keeps the small proportional offset (5).
    expect(path).toBe('M0,0 C-48,0 -5,0 -10,0');
    expect(labelX).toBe(-21.125);
  });

  it('does not floor a non-boundary endpoint even when the other is a boundary', () => {
    const [path] = getBoundaryAwareBezierPath({
      sourceIsBoundary: false,
      sourcePosition: Position.Right,
      sourceX: -10,
      sourceY: 0,
      targetIsBoundary: true,
      targetPosition: Position.Left,
      targetX: 0,
      targetY: 0,
    });
    expect(path).toBe('M-10,0 C-5,0 -48,0 0,0');
  });

  it('floors the control offset at a boundary endpoint in the loop-back (negative distance) branch too', () => {
    const [path, labelX] = getBoundaryAwareBezierPath({
      sourceIsBoundary: true,
      sourcePosition: Position.Right,
      sourceX: 0,
      sourceY: 0,
      targetIsBoundary: false,
      targetPosition: Position.Left,
      targetX: -1,
      targetY: 0,
    });
    // Without the floor, curvature*25*sqrt(1) = 6.25 would still hug the
    // port when the counterpart lies on the "wrong" side of a boundary port.
    expect(path).toBe('M0,0 C48,0 -7.25,0 -1,0');
    expect(labelX).toBe(15.15625);
  });
});
