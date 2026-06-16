/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const mockELKLayout = jest.fn();
jest.mock('elkjs/lib/elk.bundled.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({layout: mockELKLayout})),
}));

import {
  EDGE_KIND,
  type LevelView,
  NODE_KIND,
  PORT_IO_TYPE,
} from '~features/usecase-visualizer';
import {logger} from '~shared/lib/logger';
import {layoutLevelView} from '~widgets/graph-designer/lib/level-view-layout';

const unpositioned: LevelView = {
  containers: [
    {
      containerId: 1,
      height: 0,
      id: 'container-1:1',
      label: 'C1',
      nodeKind: NODE_KIND.CONTAINER,
      parentId: 'subgraph-1',
      width: 0,
      x: 0,
      y: 0,
    },
  ],
  dataLinks: [
    {
      edgeKind: EDGE_KIND.DATA,
      id: 'e1',
      sourceNodeId: 'mod-a',
      sourcePortId: 'p1',
      targetNodeId: 'mod-b',
      targetPortId: 'p2',
    },
  ],
  levelId: 'test',
  modules: [
    {
      height: 0,
      id: 'mod-a',
      label: 'A',
      moduleId: 1,
      moduleType: 'X',
      nodeKind: NODE_KIND.MODULE,
      parentId: 'container-1:1',
      ports: [{id: 'p1', portIoType: PORT_IO_TYPE.OUTPUT}],
      width: 0,
      x: 0,
      y: 0,
    },
    {
      height: 0,
      id: 'mod-b',
      label: 'B',
      moduleId: 2,
      moduleType: 'Y',
      nodeKind: NODE_KIND.MODULE,
      parentId: 'container-1:1',
      ports: [{id: 'p2', portIoType: PORT_IO_TYPE.INPUT}],
      width: 0,
      x: 0,
      y: 0,
    },
  ],
  subgraphs: [
    {
      height: 0,
      id: 'subgraph-1',
      label: 'SG1',
      nodeKind: NODE_KIND.SUBGRAPH,
      subgraphId: 1,
      width: 0,
      x: 0,
      y: 0,
    },
  ],
};

const emptyGraph: LevelView = {
  containers: [],
  controlLinks: [],
  dataLinks: [],
  levelId: 'empty',
  modules: [],
  subgraphs: [],
  subsystems: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: ELK resolves with no positioned nodes — safe default for structural tests.
  mockELKLayout.mockResolvedValue({children: [], id: 'test'});
});

describe('layoutLevelView', () => {
  it('preserves the levelId on the returned LevelView', async () => {
    const result = await layoutLevelView(unpositioned);
    expect(result.levelId).toBe('test');
  });

  it('applies positions from the ELK result to module nodes', async () => {
    mockELKLayout.mockResolvedValueOnce({
      children: [
        {height: 64, id: 'mod-a', width: 120, x: 10, y: 5},
        {height: 64, id: 'mod-b', width: 120, x: 200, y: 5},
      ],
      id: 'test',
    });

    const result = await layoutLevelView(unpositioned);

    expect(result.modules?.find((m) => m.id === 'mod-a')).toMatchObject({
      height: 64,
      width: 120,
      x: 10,
      y: 5,
    });
    expect(result.modules?.find((m) => m.id === 'mod-b')).toMatchObject({
      x: 200,
      y: 5,
    });
  });

  it('returns the dataLinks array unchanged', async () => {
    const result = await layoutLevelView(unpositioned);
    expect(result.dataLinks).toEqual(unpositioned.dataLinks);
  });

  it('returns a new object without mutating the input', async () => {
    const result = await layoutLevelView(unpositioned);
    expect(result).not.toBe(unpositioned);

    // Input module positions must still be zero (immutability).
    for (const mod of unpositioned.modules ?? []) {
      expect(mod.x).toBe(0);
      expect(mod.y).toBe(0);
    }
  });

  // B8/NB5 — try/catch around elk.layout()
  it('returns the unpositioned input graph when elk.layout rejects', async () => {
    mockELKLayout.mockRejectedValueOnce(new Error('ELK internal error'));

    const result = await layoutLevelView(emptyGraph);

    expect(result).toBe(emptyGraph);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('elk.layout failed'),
      expect.objectContaining({action: 'layout_level_view'}),
    );
  });

  // B9 — logger.warn for nodes absent from ELK result
  it('emits logger.warn for a node absent from the ELK result and preserves x:0 y:0', async () => {
    const graph: LevelView = {
      ...emptyGraph,
      modules: [
        {
          height: 0,
          id: 'mod-missing',
          label: 'Missing',
          moduleId: 3,
          moduleType: '',
          nodeKind: NODE_KIND.MODULE,
          parentId: undefined,
          ports: [],
          width: 0,
          x: 0,
          y: 0,
        },
      ],
    };
    // ELK returns no children — mod-missing is absent from the result.
    mockELKLayout.mockResolvedValueOnce({children: [], id: 'empty'});

    const result = await layoutLevelView(graph);

    expect(result.modules?.[0]).toMatchObject({x: 0, y: 0});
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('missing from ELK result'),
      expect.objectContaining({action: 'layout_level_view'}),
    );
  });
});
