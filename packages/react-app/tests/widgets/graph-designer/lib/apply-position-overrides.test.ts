/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ContainerNode, LevelView, SubsystemNode} from '~entities/graph';
import {applyPositionOverrides} from '~widgets/graph-designer/lib/apply-position-overrides';

const boundary: SubsystemNode = {
  height: 100,
  id: 'ss-1',
  label: 'Boundary',
  nodeKind: 'subsystem',
  ports: [],
  subsystemId: 1,
  width: 200,
  x: 0,
  y: 0,
};

describe('applyPositionOverrides boundary subsystem', () => {
  it('overlays the boundary size and position without duplicating it', () => {
    const level: LevelView = {
      boundarySubsystem: boundary,
      levelId: 'level',
      subsystems: [],
    };

    const result = applyPositionOverrides(
      level,
      {'ss-1': {x: 12, y: 18}},
      {'ss-1': {height: 320, width: 480}},
    );

    expect(result.boundarySubsystem).toMatchObject({
      height: 320,
      width: 480,
      x: 12,
      y: 18,
    });
    expect(result.subsystems).toEqual([]);
  });

  it('overlays a split container by its logical React Flow id', () => {
    const container: ContainerNode = {
      containerSystemId: 1,
      height: 100,
      id: 'cnt-1',
      label: 'Container',
      logicalContainerId: 'cnt-1:part-0',
      nodeKind: 'container',
      width: 200,
      x: 0,
      y: 0,
    };
    const level: LevelView = {containers: [container], levelId: 'level'};

    const result = applyPositionOverrides(
      level,
      {'cnt-1:part-0': {x: 12, y: 18}},
      {'cnt-1:part-0': {height: 320, width: 480}},
    );

    expect(result.containers).toEqual([
      expect.objectContaining({
        height: 320,
        width: 480,
        x: 12,
        y: 18,
      }),
    ]);
  });
});
