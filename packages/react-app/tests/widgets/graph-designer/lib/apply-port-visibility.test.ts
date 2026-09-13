/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {LevelView, ModuleNode, SubsystemNode} from '~entities/graph';
import {applyPortVisibility} from '~widgets/graph-designer/lib/apply-port-visibility';

function moduleNode(id: string, portIds: string[]): ModuleNode {
  return {
    height: 80,
    id,
    label: id,
    moduleId: 1,
    moduleType: 'Mod',
    nodeKind: 'module',
    ports: portIds.map((portId, i) => ({
      id: portId,
      name: portId,
      portIoType: i % 2 === 0 ? 'input' : 'output',
    })),
    width: 160,
    x: 0,
    y: 0,
  };
}

function boundaryNode(): SubsystemNode {
  return {
    height: 120,
    id: 'ss-1',
    label: 'Boundary subsystem',
    nodeKind: 'subsystem',
    ports: [
      {id: 'in-1', name: 'Input', portIoType: 'input'},
      {id: 'out-1', name: 'Output', portIoType: 'output'},
      {id: 'ctrl-1', name: 'Control', portIoType: 'control'},
    ],
    subsystemId: 'subsystem-1',
    width: 240,
    x: 0,
    y: 0,
  };
}

function baseLevel(): LevelView {
  return {
    controlLinks: [
      {
        edgeKind: 'control',
        id: 'c-1',
        sourceNodeId: 'module-1',
        sourcePortId: 'ctrl-out',
        targetNodeId: 'module-2',
        targetPortId: 'ctrl-in',
      },
    ],
    dataLinks: [
      {
        edgeKind: 'data',
        id: 'd-1',
        sourceNodeId: 'module-1',
        sourcePortId: 'out-1',
        targetNodeId: 'module-2',
        targetPortId: 'in-1',
      },
    ],
    levelId: 'top',
    modules: [
      moduleNode('module-1', ['m1-in', 'out-1', 'ctrl-out', 'unused-1']),
      moduleNode('module-2', ['in-1', 'ctrl-in', 'unused-2']),
      moduleNode('module-3', ['unused-3']),
    ],
    proxyDataLinks: [
      {
        edgeKind: 'proxy-data',
        id: 'proxy-d-1',
        sourceNodeId: 'module-3',
        sourcePortId: 'unused-3',
        targetNodeId: 'subgraph-proxy-1',
        targetPortId: 'proxy-target',
      },
    ],
  };
}

function levelWithBoundaryLinks(): LevelView {
  const level = baseLevel();
  return {
    ...level,
    boundarySubsystem: boundaryNode(),
    controlLinks: [
      ...(level.controlLinks ?? []),
      {
        edgeKind: 'control',
        id: 'boundary-control-1',
        sourceNodeId: 'ss-1',
        sourcePortId: 'ctrl-1',
        targetNodeId: 'module-1',
        targetPortId: 'ctrl-out',
      },
    ],
    dataLinks: [
      ...(level.dataLinks ?? []),
      {
        edgeKind: 'data',
        id: 'boundary-data-1',
        sourceNodeId: 'module-1',
        sourcePortId: 'out-1',
        targetNodeId: 'ss-1',
        targetPortId: 'in-1',
      },
    ],
  };
}

function levelWithInactiveBoundary(): LevelView {
  return {
    ...baseLevel(),
    boundarySubsystem: boundaryNode(),
  };
}

describe('applyPortVisibility', () => {
  let activeOut: LevelView;

  beforeEach(() => {
    activeOut = applyPortVisibility(baseLevel(), 'active');
  });

  // 'all' mode should be a no-op — same LevelView reference returned unchanged
  it('returns the same reference when mode is "all"', () => {
    const level = baseLevel();
    expect(applyPortVisibility(level, 'all')).toBe(level);
  });

  // The boundary node's own ports are never activity-filtered — a port's
  // external link lives outside this level's link set, so filtering by
  // this level's links alone would incorrectly hide boundary ports whose
  // only link was just deleted on the other side of the boundary.
  it('keeps all boundary ports regardless of activity', () => {
    expect(
      applyPortVisibility(
        levelWithBoundaryLinks(),
        'active',
      ).boundarySubsystem?.ports.map((port) => port.id),
    ).toEqual(['in-1', 'out-1', 'ctrl-1']);
  });

  it('keeps the boundary when no boundary ports are active', () => {
    expect(
      applyPortVisibility(levelWithInactiveBoundary(), 'active')
        .boundarySubsystem?.id,
    ).toBe('ss-1');
  });

  it('passes the boundary through unchanged, by reference', () => {
    const level = levelWithBoundaryLinks();
    level.boundarySubsystem = {
      ...level.boundarySubsystem!,
      height: 600,
      meta: {systemId: 'system-1'},
      width: 800,
      x: 12,
      y: 34,
    };

    const result = applyPortVisibility(level, 'active');

    expect(result.boundarySubsystem).toBe(level.boundarySubsystem);
  });

  // 'active' mode should keep only ports that a dataLink/controlLink touches
  it('keeps only ports referenced as sourcePortId or targetPortId in dataLinks or controlLinks', () => {
    const m1 = activeOut.modules?.find((m) => m.id === 'module-1');
    const m2 = activeOut.modules?.find((m) => m.id === 'module-2');

    expect(m1?.ports.map((p) => p.id).sort()).toEqual(['ctrl-out', 'out-1']);
    expect(m2?.ports.map((p) => p.id).sort()).toEqual(['ctrl-in', 'in-1']);
  });

  // A port referenced only via a proxy link is still active — applyCollapses
  // moves boundary-crossing dataLinks/controlLinks into proxy links, so a
  // proxy-only reference means the port is genuinely connected, not unused.
  it('keeps ports referenced only via proxyDataLinks/proxyControlLinks', () => {
    const m3 = activeOut.modules?.find((m) => m.id === 'module-3');

    expect(m3?.ports.map((p) => p.id)).toEqual(['unused-3']);
  });

  // Filtering only touches ports — every other module field must stay as-is
  it('leaves module height, width, and other fields untouched', () => {
    const m1 = activeOut.modules?.find((m) => m.id === 'module-1');

    expect(m1?.height).toBe(80);
    expect(m1?.width).toBe(160);
    expect(m1?.label).toBe('module-1');
  });

  // Port ids come from each module's own port catalog and are not guaranteed
  // unique across modules. Matching must be scoped by nodeId:portId so a
  // connection on one module's port never marks a different module's
  // same-numbered port as active.
  it('does not treat a same-id port on a different module as active', () => {
    const level: LevelView = {
      ...baseLevel(),
      dataLinks: [
        {
          edgeKind: 'data',
          id: 'd-collide',
          sourceNodeId: 'module-6',
          sourcePortId: '5',
          targetNodeId: 'module-2',
          targetPortId: 'in-1',
        },
      ],
      modules: [
        moduleNode('module-5', ['5']),
        moduleNode('module-6', ['5']),
        moduleNode('module-2', ['in-1']),
      ],
    };

    const out = applyPortVisibility(level, 'active');

    const m5 = out.modules?.find((m) => m.id === 'module-5');
    const m6 = out.modules?.find((m) => m.id === 'module-6');
    expect(m5?.ports).toEqual([]);
    expect(m6?.ports.map((p) => p.id)).toEqual(['5']);
  });
});
