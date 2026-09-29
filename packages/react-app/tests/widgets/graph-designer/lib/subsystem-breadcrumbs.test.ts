/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseGraphData} from '~features/graph-designer';
import {buildSubsystemBreadcrumbPath} from '~widgets/graph-designer/lib/subsystem-breadcrumbs';

const subsystems: UsecaseGraphData['subsystems'] = {
  child: {
    childSubsystemIds: [],
    controlPorts: [],
    dataPorts: [],
    parentSubsystemId: 'root',
    subgraphs: [],
    subsystemId: 'child',
    subsystemName: 'Child',
  },
  root: {
    childSubsystemIds: ['child'],
    controlPorts: [],
    dataPorts: [],
    subgraphs: [],
    subsystemId: 'root',
    subsystemName: 'Root',
  },
};

const cyclicSubsystems: UsecaseGraphData['subsystems'] = {
  'cycle-a': {
    childSubsystemIds: ['cycle-b'],
    controlPorts: [],
    dataPorts: [],
    parentSubsystemId: 'cycle-b',
    subgraphs: [],
    subsystemId: 'cycle-a',
    subsystemName: 'Cycle A',
  },
  'cycle-b': {
    childSubsystemIds: ['cycle-a'],
    controlPorts: [],
    dataPorts: [],
    parentSubsystemId: 'cycle-a',
    subgraphs: [],
    subsystemId: 'cycle-b',
    subsystemName: 'Cycle B',
  },
};

describe('buildSubsystemBreadcrumbPath', () => {
  it('returns TOP followed by root-to-active subsystem segments', () => {
    expect(buildSubsystemBreadcrumbPath('child', subsystems)).toEqual([
      {label: 'TOP', systemId: null},
      {label: 'Root', systemId: 'root'},
      {label: 'Child', systemId: 'child'},
    ]);
  });

  it('returns no path when the active subsystem is missing', () => {
    expect(buildSubsystemBreadcrumbPath('missing', subsystems)).toEqual([]);
  });

  it('returns no path when parent relationships are cyclic', () => {
    expect(buildSubsystemBreadcrumbPath('cycle-a', cyclicSubsystems)).toEqual(
      [],
    );
  });
});
