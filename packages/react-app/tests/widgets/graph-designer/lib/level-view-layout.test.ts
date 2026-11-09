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
  type SubsystemNode,
} from '~entities/graph';
import {NODE_DIMENSIONS} from '~features/usecase-visualizer';
import {logger} from '~shared/lib/logger';
import {layoutLevelView} from '~widgets/graph-designer/lib/level-view-layout';

const CP = NODE_DIMENSIONS.container.padding;
const CH = NODE_DIMENSIONS.container.headerHeight;
const SP = NODE_DIMENSIONS.subgraph.padding;
const SH = NODE_DIMENSIONS.subgraph.headerHeight;
const MH = NODE_DIMENSIONS.module.minHeight;
const MW = NODE_DIMENSIONS.module.minWidth;

interface MockElkNode {
  children?: MockElkNode[];
  height: number;
  id: string;
  width: number;
  x?: number;
  y?: number;
}

function mockModule(id: string, x: number, y: number): MockElkNode {
  return {height: MH, id, width: MW, x, y};
}

function mockContainer(
  id: string,
  children: MockElkNode[],
  x: number,
  y: number,
): MockElkNode {
  const maxRight = Math.max(0, ...children.map((node) => node.x! + node.width));
  const maxBottom = Math.max(
    0,
    ...children.map((node) => node.y! + node.height),
  );
  return {
    children,
    height: Math.max(maxBottom + CP, CH + 2 * CP),
    id,
    width: Math.max(maxRight + CP, 2 * CP),
    x,
    y,
  };
}

function mockSubgraph(id: string, children: MockElkNode[]): MockElkNode {
  const maxRight = Math.max(0, ...children.map((node) => node.x! + node.width));
  const maxBottom = Math.max(
    0,
    ...children.map((node) => node.y! + node.height),
  );
  return {
    children,
    height: maxBottom + SP,
    id,
    width: Math.max(maxRight + SP, NODE_DIMENSIONS.subgraph.minWidth),
  };
}

function baselineElkResult(): MockElkNode {
  return mockSubgraph('test', [
    mockContainer(
      'container-1:1',
      [mockModule('mod-a', CP, CH + CP), mockModule('mod-b', 200 + CP, CH + CP)],
      SP,
      SH + SP,
    ),
  ]);
}

// Single container, two modules, one data link — the baseline fixture.
const unpositioned: LevelView = {
  containers: [
    {
      containerSystemId: 1,
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
      subgraphSystemId: 1,
      width: 0,
      x: 0,
      y: 0,
    },
  ],
};

// Two containers (A and B) whose modules are interleaved by ELK.
// Connections: mod-1 → mod-3 → mod-2, so ELK places them in that order.
// mod-3 (cnt-b) sits between mod-1 and mod-2 (both cnt-a) → cnt-a splits.
const splitGraph: LevelView = {
  containers: [
    {
      containerSystemId: 1,
      height: 0,
      id: 'cnt-a',
      label: 'A',
      nodeKind: NODE_KIND.CONTAINER,
      parentId: 'sg-1',
      width: 0,
      x: 0,
      y: 0,
    },
    {
      containerSystemId: 2,
      height: 0,
      id: 'cnt-b',
      label: 'B',
      nodeKind: NODE_KIND.CONTAINER,
      parentId: 'sg-1',
      width: 0,
      x: 0,
      y: 0,
    },
  ],
  dataLinks: [
    {
      edgeKind: EDGE_KIND.DATA,
      id: 'e1',
      sourceNodeId: 'mod-1',
      sourcePortId: 'p1',
      targetNodeId: 'mod-3',
      targetPortId: 'p3-in',
    },
    {
      edgeKind: EDGE_KIND.DATA,
      id: 'e2',
      sourceNodeId: 'mod-3',
      sourcePortId: 'p3-out',
      targetNodeId: 'mod-2',
      targetPortId: 'p2',
    },
  ],
  levelId: 'split-test',
  modules: [
    {
      height: 0,
      id: 'mod-1',
      label: 'M1',
      moduleId: 1,
      moduleType: 'X',
      nodeKind: NODE_KIND.MODULE,
      parentId: 'cnt-a',
      ports: [{id: 'p1', portIoType: PORT_IO_TYPE.OUTPUT}],
      width: 0,
      x: 0,
      y: 0,
    },
    {
      height: 0,
      id: 'mod-2',
      label: 'M2',
      moduleId: 2,
      moduleType: 'X',
      nodeKind: NODE_KIND.MODULE,
      parentId: 'cnt-a',
      ports: [{id: 'p2', portIoType: PORT_IO_TYPE.INPUT}],
      width: 0,
      x: 0,
      y: 0,
    },
    {
      height: 0,
      id: 'mod-3',
      label: 'M3',
      moduleId: 3,
      moduleType: 'Y',
      nodeKind: NODE_KIND.MODULE,
      parentId: 'cnt-b',
      ports: [
        {id: 'p3-in', portIoType: PORT_IO_TYPE.INPUT},
        {id: 'p3-out', portIoType: PORT_IO_TYPE.OUTPUT},
      ],
      width: 0,
      x: 0,
      y: 0,
    },
  ],
  subgraphs: [
    {
      height: 0,
      id: 'sg-1',
      label: 'SG1',
      nodeKind: NODE_KIND.SUBGRAPH,
      subgraphSystemId: 1,
      width: 0,
      x: 0,
      y: 0,
    },
  ],
};

// Two subgraphs connected by one cross-subgraph data link.
// sg-a owns mod-x; sg-b owns mod-y; link: mod-x → mod-y.
// R1 must assign col(sg-a)=0 and col(sg-b)=1.
const twoSubgraphGraph: LevelView = {
  containers: [
    {
      containerSystemId: 1,
      height: 0,
      id: 'cnt-ax',
      label: 'CA',
      nodeKind: NODE_KIND.CONTAINER,
      parentId: 'sg-a',
      width: 0,
      x: 0,
      y: 0,
    },
    {
      containerSystemId: 2,
      height: 0,
      id: 'cnt-by',
      label: 'CB',
      nodeKind: NODE_KIND.CONTAINER,
      parentId: 'sg-b',
      width: 0,
      x: 0,
      y: 0,
    },
  ],
  dataLinks: [
    {
      edgeKind: EDGE_KIND.DATA,
      id: 'cross-e1',
      sourceNodeId: 'mod-x',
      sourcePortId: 'px-out',
      targetNodeId: 'mod-y',
      targetPortId: 'py-in',
    },
  ],
  levelId: 'two-sg-test',
  modules: [
    {
      height: 0,
      id: 'mod-x',
      label: 'X',
      moduleId: 1,
      moduleType: 'X',
      nodeKind: NODE_KIND.MODULE,
      parentId: 'cnt-ax',
      ports: [{id: 'px-out', portIoType: PORT_IO_TYPE.OUTPUT}],
      width: 0,
      x: 0,
      y: 0,
    },
    {
      height: 0,
      id: 'mod-y',
      label: 'Y',
      moduleId: 2,
      moduleType: 'Y',
      nodeKind: NODE_KIND.MODULE,
      parentId: 'cnt-by',
      ports: [{id: 'py-in', portIoType: PORT_IO_TYPE.INPUT}],
      width: 0,
      x: 0,
      y: 0,
    },
  ],
  subgraphs: [
    {
      height: 0,
      id: 'sg-a',
      label: 'SGA',
      nodeKind: NODE_KIND.SUBGRAPH,
      subgraphSystemId: 1,
      width: 0,
      x: 0,
      y: 0,
    },
    {
      height: 0,
      id: 'sg-b',
      label: 'SGB',
      nodeKind: NODE_KIND.SUBGRAPH,
      subgraphSystemId: 2,
      width: 0,
      x: 0,
      y: 0,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockELKLayout.mockResolvedValue(baselineElkResult());
});

describe('layoutLevelView', () => {
  it('preserves the levelId on the returned LevelView', async () => {
    const result = await layoutLevelView(unpositioned);
    expect(result.levelId).toBe('test');
  });

  it('returns the dataLinks array unchanged', async () => {
    const result = await layoutLevelView(unpositioned);
    expect(result.dataLinks).toEqual(unpositioned.dataLinks);
  });

  it('returns a new object without mutating the input', async () => {
    const result = await layoutLevelView(unpositioned);
    expect(result).not.toBe(unpositioned);
    for (const mod of unpositioned.modules ?? []) {
      expect(mod.x).toBe(0);
      expect(mod.y).toBe(0);
    }
  });

  it('returns the unpositioned input graph when elk.layout rejects', async () => {
    mockELKLayout.mockRejectedValueOnce(new Error('ELK internal error'));
    const result = await layoutLevelView(unpositioned);
    expect(result).toBe(unpositioned);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('elk.layout failed'),
      expect.objectContaining({action: 'layout_level_view'}),
    );
  });

  describe('per-subgraph ELK pass', () => {
    it("passes only the subgraph's modules to ELK in one call per subgraph", async () => {
      await layoutLevelView(unpositioned);
      expect(mockELKLayout).toHaveBeenCalledTimes(1);
      const elkArg = mockELKLayout.mock.calls[0][0];
      expect(elkArg.children).toHaveLength(1);
      expect(elkArg.children[0].children.map((n: {id: string}) => n.id)).toEqual(
        expect.arrayContaining(['mod-a', 'mod-b']),
      );
    });

    it('uses only dataLinks as ELK edges and ignores controlLinks', async () => {
      const graph: LevelView = {
        ...unpositioned,
        controlLinks: [
          {
            edgeKind: EDGE_KIND.CONTROL,
            id: 'ctrl-1',
            sourceNodeId: 'mod-a',
            sourcePortId: 'p1',
            targetNodeId: 'mod-b',
            targetPortId: 'p2',
          },
        ],
      };
      await layoutLevelView(graph);
      const elkArg = mockELKLayout.mock.calls[0][0];
      expect(elkArg.edges).toHaveLength(1);
      expect(elkArg.edges[0]).toMatchObject({
        sources: ['mod-a'],
        targets: ['mod-b'],
      });
    });

    it('passes correctly sized module nodes to ELK', async () => {
      await layoutLevelView(unpositioned);
      const elkArg = mockELKLayout.mock.calls[0][0];
      const modA = elkArg.children[0].children.find(
        (n: {id: string}) => n.id === 'mod-a',
      );
      // mod-a has 0 inputs, 1 output → calculateModuleHeight(0, 1, false) = 120
      // (minHeight)
      expect(modA).toMatchObject({
        height: NODE_DIMENSIONS.module.minHeight,
        width: NODE_DIMENSIONS.module.minWidth,
      });
    });

    it('emits a warning when ELK returns a child node without a position', async () => {
      mockELKLayout.mockResolvedValueOnce({
        children: [{children: [], height: 80, id: 'container-1:1', width: 160}],
        id: 'test',
      });
      await layoutLevelView(unpositioned);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('node missing from ELK result'),
        expect.objectContaining({action: 'layout_level_view'}),
      );
    });
  });

  describe('bounding boxes and position relativization', () => {
    // ELK returns modules at global (0, 0) and (200, 0).
    // Computed dims: height = minHeight=120, width = minWidth=160.
    // Container global: x = 0-CP = -CP, y = 0-CH-CP = -(CH+CP)
    // Container size: width = 360+2*CP, height = minHeight+2*CP
    // Subgraph global: x = -CP-SP, y = -(CH+CP+SH+SP)
    // After relativization:
    // modules at (CP, CH+CP) — x=CP inside container, y=CH+CP (below
    // header+padding) container at (SP, SH+SP) — x=SP inside subgraph, y=SH+SP
    // (below header+padding)
    beforeEach(() => {
      mockELKLayout.mockResolvedValue(baselineElkResult());
    });

    it('sets module width and height from calculateModuleHeight in the output', async () => {
      const result = await layoutLevelView(unpositioned);
      // mod-a: 0 inputs, 1 output → height minHeight=120; mod-b: 1 input, 0 → same
      expect(result.modules?.find((m) => m.id === 'mod-a')).toMatchObject({
        height: NODE_DIMENSIONS.module.minHeight,
        width: NODE_DIMENSIONS.module.minWidth,
      });
      expect(result.modules?.find((m) => m.id === 'mod-b')).toMatchObject({
        height: NODE_DIMENSIONS.module.minHeight,
        width: NODE_DIMENSIONS.module.minWidth,
      });
    });

    it('makes module positions parent-relative', async () => {
      const result = await layoutLevelView(unpositioned);
      // x: CP from container left edge; y: CH+CP (header height + padding below
      // header)
      expect(result.modules?.find((m) => m.id === 'mod-a')).toMatchObject({
        x: CP,
        y: CH + CP,
      });
      expect(result.modules?.find((m) => m.id === 'mod-b')).toMatchObject({
        x: 200 + CP,
        y: CH + CP,
      });
    });

    it('computes container dimensions from module positions', async () => {
      const result = await layoutLevelView(unpositioned);
      const container = result.containers?.find(
        (c) => c.id === 'container-1:1',
      );
      // height = module_height + CH (header) + 2*CP (top+bottom padding)
      expect(container).toMatchObject({
        height: MH + CH + 2 * CP,
        width: 360 + 2 * CP,
      });
    });

    it('makes container position subgraph-relative', async () => {
      const result = await layoutLevelView(unpositioned);
      const container = result.containers?.find(
        (c) => c.id === 'container-1:1',
      );
      // x: SP from subgraph left edge; y: SH+SP (header height + padding below
      // header)
      expect(container).toMatchObject({x: SP, y: SH + SP});
    });

    it('computes subgraph dimensions from container positions', async () => {
      const result = await layoutLevelView(unpositioned);
      const sg = result.subgraphs!.find((s) => s.id === 'subgraph-1');
      // height = module_height + CH + 2*CP + SH (header) + 2*SP (top+bottom padding)
      expect(sg).toMatchObject({
        height: MH + CH + 2 * CP + SH + 2 * SP,
        width: 360 + 2 * CP + 2 * SP,
      });
    });

    it('places subsystems with fixed minimum dimensions after subgraphs', async () => {
      const graph: LevelView = {
        ...unpositioned,
        subsystems: [
          {
            height: 0,
            id: 'ss-1',
            label: 'Subsystem 1',
            nodeKind: NODE_KIND.SUBSYSTEM,
            ports: [],
            subsystemId: 'ss-1',
            width: 0,
            x: 0,
            y: 0,
          },
        ],
      };

      const result = await layoutLevelView(graph);

      const subsystem = result.subsystems?.find((ss) => ss.id === 'ss-1');
      const subgraphWidth = 360 + 2 * CP + 2 * SP;

      expect(subsystem).toMatchObject({
        height: NODE_DIMENSIONS.subsystem.baseHeight,
        width: NODE_DIMENSIONS.subsystem.width,
        x: subgraphWidth + 2 * SP,
        y: 0,
      });
    });
  });

  describe('compound container layout', () => {
    beforeEach(() => {
      mockELKLayout.mockResolvedValue(
        mockSubgraph('split-test', [
          mockContainer(
            'cnt-a',
            [
              mockModule('mod-1', CP, CH + CP),
              mockModule('mod-2', 200 + CP, CH + CP),
            ],
            SP,
            SH + SP,
          ),
          mockContainer(
            'cnt-b',
            [mockModule('mod-3', CP, CH + CP)],
            460,
            SH + SP,
          ),
        ]),
      );
    });

    it('passes containers as ELK parents and modules as their children', async () => {
      await layoutLevelView(splitGraph);

      const elkArg = mockELKLayout.mock.calls[0][0];
      const cntA = elkArg.children.find((n: {id: string}) => n.id === 'cnt-a');
      const cntB = elkArg.children.find((n: {id: string}) => n.id === 'cnt-b');

      expect(cntA.children.map((n: {id: string}) => n.id)).toEqual([
        'mod-1',
        'mod-2',
      ]);
      expect(cntB.children.map((n: {id: string}) => n.id)).toEqual(['mod-3']);
    });

    it('does not create logical container parts in phase 1', async () => {
      const result = await layoutLevelView(unpositioned);
      const container = result.containers?.find(
        (c) => c.id === 'container-1:1',
      );
      expect(container).toBeDefined();
      expect(container?.logicalContainerId).toBeUndefined();
    });

    it('keeps modules in their original parent containers', async () => {
      const result = await layoutLevelView(splitGraph);
      const m1 = result.modules?.find((m) => m.id === 'mod-1');
      const m2 = result.modules?.find((m) => m.id === 'mod-2');
      const m3 = result.modules?.find((m) => m.id === 'mod-3');
      expect(m1?.parentId).toBe('cnt-a');
      expect(m2?.parentId).toBe('cnt-a');
      expect(m3?.parentId).toBe('cnt-b');
    });

    it('keeps an unlinked module nested under its assigned container', async () => {
      const orphanGraph: LevelView = {
        ...splitGraph,
        dataLinks: [splitGraph.dataLinks![0]],
      };

      await layoutLevelView(orphanGraph);

      const elkArg = mockELKLayout.mock.calls[0][0];
      const cntA = elkArg.children.find((n: {id: string}) => n.id === 'cnt-a');

      expect(cntA.children.map((n: {id: string}) => n.id)).toEqual([
        'mod-1',
        'mod-2',
      ]);
    });
  });

  describe('subgraph gap enforcement', () => {
    // Two subgraphs at the same x column, ELK places their modules with only
    // nodeNode=30 vertical gap — far less than the subgraph box extensions.
    // The layout must push the lower subgraph down to ensure minGap=50.
    const verticalGraph: LevelView = {
      containers: [
        {
          containerSystemId: 1,
          height: 0,
          id: 'cnt-1',
          label: 'C1',
          nodeKind: NODE_KIND.CONTAINER,
          parentId: 'sg-1',
          width: 0,
          x: 0,
          y: 0,
        },
        {
          containerSystemId: 2,
          height: 0,
          id: 'cnt-2',
          label: 'C2',
          nodeKind: NODE_KIND.CONTAINER,
          parentId: 'sg-2',
          width: 0,
          x: 0,
          y: 0,
        },
      ],
      dataLinks: [],
      levelId: 'vert-gap',
      modules: [
        {
          height: 0,
          id: 'mod-top',
          label: 'T',
          moduleId: 1,
          moduleType: 'X',
          nodeKind: NODE_KIND.MODULE,
          parentId: 'cnt-1',
          ports: [],
          width: 0,
          x: 0,
          y: 0,
        },
        {
          height: 0,
          id: 'mod-bot',
          label: 'B',
          moduleId: 2,
          moduleType: 'X',
          nodeKind: NODE_KIND.MODULE,
          parentId: 'cnt-2',
          ports: [],
          width: 0,
          x: 0,
          y: 0,
        },
      ],
      subgraphs: [
        {
          height: 0,
          id: 'sg-1',
          label: 'SG1',
          nodeKind: NODE_KIND.SUBGRAPH,
          subgraphSystemId: 1,
          width: 0,
          x: 0,
          y: 0,
        },
        {
          height: 0,
          id: 'sg-2',
          label: 'SG2',
          nodeKind: NODE_KIND.SUBGRAPH,
          subgraphSystemId: 2,
          width: 0,
          x: 0,
          y: 0,
        },
      ],
    };

    it('ensures at least 50px vertical gap between subgraphs at the same x column', async () => {
      // Both subgraphs start at y=0 (same column); enforceSubgraphGaps pushes
      // the lower one down to ensure minGap=50.
      mockELKLayout
        .mockResolvedValueOnce(
          mockSubgraph('sg-1', [
            mockContainer(
              'cnt-1',
              [mockModule('mod-top', CP, CH + CP)],
              SP,
              SH + SP,
            ),
          ]),
        )
        .mockResolvedValueOnce(
          mockSubgraph('sg-2', [
            mockContainer(
              'cnt-2',
              [mockModule('mod-bot', CP, CH + CP)],
              SP,
              SH + SP,
            ),
          ]),
        );

      const result = await layoutLevelView(verticalGraph);
      const sg1 = result.subgraphs!.find((s) => s.id === 'sg-1')!;
      const sg2 = result.subgraphs!.find((s) => s.id === 'sg-2')!;

      expect(sg2.y).toBeGreaterThanOrEqual(sg1.y + sg1.height + 50);
    });

    it('does not push subgraphs in different columns apart vertically', async () => {
      // sg-a (col 0) and sg-b (col 1) have non-overlapping x-bands; the gap
      // enforcement must leave sg-b.y unchanged at 0.
      mockELKLayout
        .mockResolvedValueOnce(
          mockSubgraph('sg-a', [
            mockContainer(
              'cnt-ax',
              [mockModule('mod-x', CP, CH + CP)],
              SP,
              SH + SP,
            ),
          ]),
        )
        .mockResolvedValueOnce(
          mockSubgraph('sg-b', [
            mockContainer(
              'cnt-by',
              [mockModule('mod-y', CP, CH + CP)],
              SP,
              SH + SP,
            ),
          ]),
        );

      const result = await layoutLevelView(twoSubgraphGraph);
      const sgB = result.subgraphs!.find((s) => s.id === 'sg-b')!;
      expect(sgB.y).toBe(0);
    });
  });

  describe('two-level layout (R1+R2)', () => {
    it('places the upstream subgraph to the left of the downstream subgraph', async () => {
      mockELKLayout
        .mockResolvedValueOnce(
          mockSubgraph('sg-a', [
            mockContainer(
              'cnt-ax',
              [mockModule('mod-x', CP, CH + CP)],
              SP,
              SH + SP,
            ),
          ]),
        )
        .mockResolvedValueOnce(
          mockSubgraph('sg-b', [
            mockContainer(
              'cnt-by',
              [mockModule('mod-y', CP, CH + CP)],
              SP,
              SH + SP,
            ),
          ]),
        );

      const result = await layoutLevelView(twoSubgraphGraph);
      const sgA = result.subgraphs!.find((s) => s.id === 'sg-a')!;
      const sgB = result.subgraphs!.find((s) => s.id === 'sg-b')!;
      expect(sgA.x).toBeLessThan(sgB.x);
    });

    it('calls ELK once per subgraph and excludes the cross-subgraph link', async () => {
      mockELKLayout
        .mockResolvedValueOnce(
          mockSubgraph('sg-a', [
            mockContainer(
              'cnt-ax',
              [mockModule('mod-x', CP, CH + CP)],
              SP,
              SH + SP,
            ),
          ]),
        )
        .mockResolvedValueOnce(
          mockSubgraph('sg-b', [
            mockContainer(
              'cnt-by',
              [mockModule('mod-y', CP, CH + CP)],
              SP,
              SH + SP,
            ),
          ]),
        );

      await layoutLevelView(twoSubgraphGraph);

      expect(mockELKLayout).toHaveBeenCalledTimes(2);
      for (const [arg] of mockELKLayout.mock.calls) {
        expect((arg as {edges: {id: string}[]}).edges).toHaveLength(0);
      }
    });
  });

  it('wraps scoped roots in a frame-relative boundary', async () => {
    const boundary: SubsystemNode = {
      height: NODE_DIMENSIONS.subsystemBoundary.minHeight,
      id: 'ss-1',
      label: 'Boundary',
      nodeKind: NODE_KIND.SUBSYSTEM,
      ports: Array.from({length: 5}, (_, index) => ({
        id: `control-${index}`,
        portIoType: PORT_IO_TYPE.CONTROL,
      })),
      subsystemId: 'ss-1',
      width: NODE_DIMENSIONS.subsystemBoundary.minWidth,
      x: 0,
      y: 0,
    };
    const result = await layoutLevelView({
      ...unpositioned,
      boundarySubsystem: boundary,
    });

    expect(result.boundarySubsystem).toMatchObject({id: 'ss-1', x: 0, y: 0});
    expect(result.subgraphs?.every((node) => node.parentId === 'ss-1')).toBe(
      true,
    );
    expect(result.boundarySubsystem?.width).toBeGreaterThanOrEqual(
      NODE_DIMENSIONS.subsystemBoundary.minWidth,
    );
  });
});
