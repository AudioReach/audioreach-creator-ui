/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import type {
  ControlLink,
  DataLink,
  LevelView,
  ModuleNode,
  SubsystemNode,
} from '~entities/graph';
import {applySubsystemSimplification} from '~widgets/graph-designer/lib/apply-subsystem-simplification';

function makeModuleNode(id: string): ModuleNode {
  return {
    height: 80,
    id,
    label: id,
    moduleId: 1,
    moduleType: 'module',
    nodeKind: 'module',
    ports: [
      {id: 'input', portIoType: 'input'},
      {id: 'output', portIoType: 'output'},
    ],
    width: 160,
    x: 0,
    y: 0,
  };
}

function makeSubsystemNode(id: string): SubsystemNode {
  return {
    height: 100,
    id,
    label: id,
    meta: {systemId: id},
    nodeKind: 'subsystem',
    ports: [{id: 'raw', portIoType: 'input'}],
    subsystemId: id,
    width: 200,
    x: 0,
    y: 0,
  };
}

function makeDataLink(overrides: Partial<DataLink> = {}): DataLink {
  return {
    edgeKind: 'data',
    id: 'data-1',
    sourceNodeId: 'subsystem-a',
    sourcePortId: 'raw-output',
    targetNodeId: 'module-a',
    targetPortId: 'input',
    ...overrides,
  };
}

function makeControlLink(overrides: Partial<ControlLink> = {}): ControlLink {
  return {
    edgeKind: 'control',
    id: 'control-1',
    sourceNodeId: 'module-a',
    sourcePortId: 'output',
    targetNodeId: 'subsystem-a',
    targetPortId: 'raw-control',
    ...overrides,
  };
}

function makeLevel(overrides: Partial<LevelView> = {}): LevelView {
  return {
    levelId: 'top',
    modules: [makeModuleNode('module-a'), makeModuleNode('module-b')],
    subsystems: [makeSubsystemNode('subsystem-a')],
    ...overrides,
  };
}

describe('applySubsystemSimplification', () => {
  it('returns the original level when no raw link touches a subsystem', () => {
    const level = makeLevel({
      dataLinks: [
        makeDataLink({
          sourceNodeId: 'module-a',
          targetNodeId: 'module-b',
        }),
      ],
    });

    expect(applySubsystemSimplification(level)).toBe(level);
  });

  it('replaces a subsystem data link with a locked subsystem proxy link', () => {
    const result = applySubsystemSimplification(
      makeLevel({
        dataLinks: [makeDataLink()],
      }),
    );

    expect(result.dataLinks).toEqual([]);
    expect(result.proxyDataLinks).toEqual([
      expect.objectContaining({
        edgeKind: 'proxy-data',
        id: 'subsystem-proxy:data:subsystem-a:virtual:ss:subsystem-a:data:out:module-a:input',
        kind: 'subsystem',
        locked: true,
        realConnectionIds: ['data-1'],
      }),
    ]);
    expect(result.subsystems?.[0]?.ports).toEqual([
      {
        id: 'virtual:ss:subsystem-a:data:out',
        locked: true,
        portIoType: 'output',
      },
    ]);
  });

  it('keeps raw ports on a subsystem untouched by simplified links', () => {
    const untouched = makeSubsystemNode('subsystem-b');
    const result = applySubsystemSimplification(
      makeLevel({
        dataLinks: [makeDataLink()],
        subsystems: [makeSubsystemNode('subsystem-a'), untouched],
      }),
    );

    expect(result.subsystems?.[1]).toBe(untouched);
  });

  it('uses the dangling suffix for an inter-usecase link', () => {
    const result = applySubsystemSimplification(
      makeLevel({
        dataLinks: [
          makeDataLink({
            isInterUsecase: true,
            sourceNodeId: 'module-a',
            targetNodeId: 'subsystem-a',
          }),
        ],
      }),
    );

    expect(result.proxyDataLinks?.[0]?.targetPortId).toBe(
      'virtual:ss:subsystem-a:data:in:dangling',
    );
  });

  it('groups data links with equal simplified endpoints', () => {
    const result = applySubsystemSimplification(
      makeLevel({
        dataLinks: [makeDataLink({id: 'data-1'}), makeDataLink({id: 'data-2'})],
      }),
    );

    expect(result.proxyDataLinks).toHaveLength(1);
    expect(result.proxyDataLinks?.[0]?.realConnectionIds).toEqual([
      'data-1',
      'data-2',
    ]);
  });

  it('replaces a control link and adds a locked control port', () => {
    const result = applySubsystemSimplification(
      makeLevel({
        controlLinks: [makeControlLink()],
      }),
    );

    expect(result.controlLinks).toEqual([]);
    expect(result.proxyControlLinks?.[0]).toEqual(
      expect.objectContaining({
        edgeKind: 'proxy-control',
        locked: true,
        realConnectionIds: ['control-1'],
      }),
    );
    expect(result.subsystems?.[0]?.ports).toContainEqual({
      id: 'virtual:ss:subsystem-a:control',
      locked: true,
      portIoType: 'control',
    });
  });

  it('uses connection-specific locked boundary ports', () => {
    const result = applySubsystemSimplification(
      makeLevel({
        boundarySubsystem: makeSubsystemNode('boundary-a'),
        dataLinks: [
          makeDataLink({
            id: 'data-boundary',
            sourceNodeId: 'boundary-a',
          }),
        ],
      }),
    );

    expect(result.boundarySubsystem?.ports).toEqual([
      {
        id: 'virtual:ss:boundary-a:boundary:data:data-boundary',
        locked: true,
        portIoType: 'output',
      },
    ]);
  });
});
