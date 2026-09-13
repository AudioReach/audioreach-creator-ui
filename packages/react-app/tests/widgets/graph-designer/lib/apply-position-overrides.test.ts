/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {LevelView, SubsystemNode} from '~entities/graph';
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
});
