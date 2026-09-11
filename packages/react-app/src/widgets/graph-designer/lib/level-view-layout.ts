/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ElkNode} from 'elkjs';
import ELK from 'elkjs/lib/elk.bundled.js';

import {
  type ContainerNode,
  type DataLink,
  type LevelView,
  type ModuleNode,
  PORT_IO_TYPE,
  type SubgraphNode,
  type SubsystemNode,
} from '~entities/graph';
import {
  calculateModuleHeight,
  NODE_DIMENSIONS,
} from '~features/usecase-visualizer';
import {logger} from '~shared/lib/logger';

const elk = new ELK();

const ELK_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.padding': '[top=44,left=20,bottom=20,right=20]',
  'elk.spacing.nodeNode': '30',
};

const SUBGRAPH_COLUMN_GAP = 80;

type Dims = {height: number; width: number};
type Pos = {x: number; y: number};
type Box = {height: number; width: number; x: number; y: number};

function computeModuleDimensions(modules: ModuleNode[]): Map<string, Dims> {
  const map = new Map<string, Dims>();
  for (const m of modules) {
    const inputCount = m.ports.filter(
      (p) => p.portIoType === PORT_IO_TYPE.INPUT,
    ).length;
    const outputCount = m.ports.filter(
      (p) => p.portIoType === PORT_IO_TYPE.OUTPUT,
    ).length;
    map.set(m.id, {
      height: calculateModuleHeight(inputCount, outputCount, false),
      width: NODE_DIMENSIONS.module.minWidth,
    });
  }
  return map;
}

function buildModuleToSubgraph(
  modules: ModuleNode[],
  containers: ContainerNode[],
): Map<string, string> {
  const containerToSubgraph = new Map<string, string>();
  for (const c of containers) {
    if (c.parentId) {
      containerToSubgraph.set(c.id, c.parentId);
    }
  }
  const map = new Map<string, string>();
  for (const m of modules) {
    const sgId = containerToSubgraph.get(m.parentId ?? '');
    if (sgId) {
      map.set(m.id, sgId);
    }
  }
  return map;
}

function buildInterSubgraphGraph(
  dataLinks: DataLink[],
  moduleToSubgraph: Map<string, string>,
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const link of dataLinks) {
    const srcSg = moduleToSubgraph.get(link.sourceNodeId);
    const tgtSg = moduleToSubgraph.get(link.targetNodeId);
    if (!srcSg || !tgtSg || srcSg === tgtSg) {
      continue;
    }
    if (!adj.has(srcSg)) {
      adj.set(srcSg, new Set());
    }
    adj.get(srcSg)!.add(tgtSg);
  }
  return adj;
}

function assignSubgraphColumns(
  subgraphIds: string[],
  adj: Map<string, Set<string>>,
): Map<string, number> {
  const columns = new Map<string, number>();
  const inDegree = new Map<string, number>();
  for (const id of subgraphIds) {
    columns.set(id, 0);
    inDegree.set(id, 0);
  }
  for (const targets of adj.values()) {
    for (const tgt of targets) {
      inDegree.set(tgt, (inDegree.get(tgt) ?? 0) + 1);
    }
  }

  const queue: string[] = subgraphIds.filter(
    (id) => (inDegree.get(id) ?? 0) === 0,
  );
  while (queue.length > 0) {
    const u = queue.shift()!;
    const col = columns.get(u) ?? 0;
    for (const v of adj.get(u) ?? []) {
      columns.set(v, Math.max(columns.get(v) ?? 0, col + 1));
      const newDeg = (inDegree.get(v) ?? 0) - 1;
      inDegree.set(v, newDeg);
      if (newDeg === 0) {
        queue.push(v);
      }
    }
  }

  // Any subgraph not reached by Kahn's is part of a cycle; default to column 0.
  for (const id of subgraphIds) {
    if ((inDegree.get(id) ?? 0) > 0) {
      logger.warn(
        'assignSubgraphColumns: cycle detected — subgraph defaulting to column 0',
        {
          action: 'layout_level_view',
          component: 'levelViewLayout',
        },
      );
    }
  }

  return columns;
}

async function runSubgraphElkPass(
  sgId: string,
  modules: ModuleNode[],
  dataLinks: DataLink[],
  dims: Map<string, Dims>,
): Promise<Map<string, Pos>> {
  const graph: ElkNode = {
    children: modules.map((m) => {
      const d = dims.get(m.id) ?? {height: 80, width: 160};
      return {height: d.height, id: m.id, width: d.width};
    }),
    edges: dataLinks.map((e) => ({
      id: e.id,
      sources: [e.sourceNodeId],
      targets: [e.targetNodeId],
    })),
    id: sgId,
    layoutOptions: ELK_OPTIONS,
  };

  const result = await elk.layout(graph);

  const pos = new Map<string, Pos>();
  for (const n of result.children ?? []) {
    if (n.x !== undefined) {
      pos.set(n.id, {x: n.x, y: n.y ?? 0});
    } else {
      logger.warn('layoutLevelView: node missing from ELK result', {
        action: 'layout_level_view',
        component: 'levelViewLayout',
      });
    }
  }
  return pos;
}

function splitContainers(
  modules: ModuleNode[],
  containers: ContainerNode[],
  positions: Map<string, Pos>,
): {containers: ContainerNode[]; modules: ModuleNode[]} {
  const moduleX = new Map<string, number>();
  for (const m of modules) {
    moduleX.set(m.id, positions.get(m.id)?.x ?? 0);
  }

  const newContainers: ContainerNode[] = [];
  const moduleParentUpdates = new Map<string, string>();

  for (const container of containers) {
    const cMods = modules.filter((m) => m.parentId === container.id);

    if (cMods.length === 0) {
      newContainers.push(container);
      continue;
    }

    // Sorted unique x-values belonging to this container
    const cXs = [...new Set(cMods.map((m) => moduleX.get(m.id) ?? 0))].sort(
      (a, b) => a - b,
    );

    // x-values belonging to OTHER containers
    const foreignXs = modules
      .filter((m) => m.parentId !== container.id)
      .map((m) => moduleX.get(m.id) ?? 0);

    // Find gaps: consecutive container columns with a foreign column strictly
    // between
    const splitAfterX: number[] = [];
    for (let i = 0; i < cXs.length - 1; i++) {
      const x1 = cXs[i];
      const x2 = cXs[i + 1];
      if (foreignXs.some((fx) => fx > x1 && fx < x2)) {
        splitAfterX.push(x1);
      }
    }

    if (splitAfterX.length === 0) {
      newContainers.push(container);
      continue;
    }

    // Assign each module to a cluster based on where its x falls
    const thresholds = [...splitAfterX, Infinity];
    const clusters: ModuleNode[][] = Array.from(
      {length: thresholds.length},
      () => [],
    );
    for (const m of cMods) {
      const mx = moduleX.get(m.id) ?? 0;
      const idx = thresholds.findIndex((t) => mx <= t);
      clusters[idx].push(m);
    }

    let partIdx = 0;
    for (const cluster of clusters) {
      if (cluster.length === 0) {
        continue;
      }
      const logicalContainerId = `${container.id}:part-${partIdx}`;
      newContainers.push({
        ...container,
        height: 0,
        logicalContainerId,
        width: 0,
        x: 0,
        y: 0,
      });
      for (const m of cluster) {
        moduleParentUpdates.set(m.id, logicalContainerId);
      }
      partIdx++;
    }
  }

  const updatedModules = modules.map((m) => {
    const newParentId = moduleParentUpdates.get(m.id);
    return newParentId ? {...m, parentId: newParentId} : m;
  });

  return {containers: newContainers, modules: updatedModules};
}

function computeBoundingBoxes(
  modules: ModuleNode[],
  containers: ContainerNode[],
  subgraphs: SubgraphNode[],
  subsystems: SubsystemNode[],
  positions: Map<string, Pos>,
  dims: Map<string, Dims>,
): {
  containers: ContainerNode[];
  modules: ModuleNode[];
  subgraphs: SubgraphNode[];
  subsystems: SubsystemNode[];
} {
  const {headerHeight: CH, padding: CP} = NODE_DIMENSIONS.container;
  const {
    headerHeight: SH,
    minWidth: SMW,
    padding: SP,
  } = NODE_DIMENSIONS.subgraph;

  // --- Container bounding boxes (from global module positions) ---
  // Module parentId is the effective container key:
  //   split part  → logicalContainerId   non-split → container.id
  const modsByContainer = new Map<string, ModuleNode[]>();
  for (const m of modules) {
    const key = m.parentId ?? '';
    if (!modsByContainer.has(key)) {
      modsByContainer.set(key, []);
    }
    modsByContainer.get(key)!.push(m);
  }

  const containerGlobal = new Map<string, Box>();
  const updatedContainers: ContainerNode[] = containers.map((container) => {
    const key = container.logicalContainerId ?? container.id;
    const cMods = modsByContainer.get(key) ?? [];
    if (cMods.length === 0) {
      return container;
    }

    let minX = Infinity,
      minY = Infinity,
      maxRight = -Infinity,
      maxBottom = -Infinity;
    for (const m of cMods) {
      const pos = positions.get(m.id);
      const dim = dims.get(m.id);
      const x = pos?.x ?? 0;
      const y = pos?.y ?? 0;
      const w = dim?.width ?? 0;
      const h = dim?.height ?? 0;
      if (x < minX) {
        minX = x;
      }
      if (y < minY) {
        minY = y;
      }
      if (x + w > maxRight) {
        maxRight = x + w;
      }
      if (y + h > maxBottom) {
        maxBottom = y + h;
      }
    }

    const gx = minX - CP;
    const gy = minY - CH - CP;
    const gw = maxRight - gx + CP;
    const gh = maxBottom - gy + CP;

    containerGlobal.set(key, {height: gh, width: gw, x: gx, y: gy});
    return {...container, height: gh, width: gw, x: gx, y: gy};
  });

  // --- Subgraph bounding boxes (from global container positions) ---
  const containersBySubgraph = new Map<string, ContainerNode[]>();
  for (const c of updatedContainers) {
    const sgId = c.parentId ?? '';
    if (!containersBySubgraph.has(sgId)) {
      containersBySubgraph.set(sgId, []);
    }
    containersBySubgraph.get(sgId)!.push(c);
  }

  const subgraphGlobal = new Map<string, Box>();
  const updatedSubgraphs: SubgraphNode[] = subgraphs.map((sg) => {
    const sgContainers = containersBySubgraph.get(sg.id) ?? [];
    if (sgContainers.length === 0) {
      return sg;
    }

    let minX = Infinity,
      minY = Infinity,
      maxRight = -Infinity,
      maxBottom = -Infinity;
    for (const c of sgContainers) {
      const key = c.logicalContainerId ?? c.id;
      const b = containerGlobal.get(key) ?? {height: 0, width: 0, x: 0, y: 0};
      if (b.x < minX) {
        minX = b.x;
      }
      if (b.y < minY) {
        minY = b.y;
      }
      if (b.x + b.width > maxRight) {
        maxRight = b.x + b.width;
      }
      if (b.y + b.height > maxBottom) {
        maxBottom = b.y + b.height;
      }
    }

    const gx = minX - SP;
    const gy = minY - SH - SP;
    const gw = Math.max(maxRight - gx + SP, SMW);
    const gh = maxBottom - gy + SP;

    subgraphGlobal.set(sg.id, {height: gh, width: gw, x: gx, y: gy});
    return {...sg, height: gh, width: gw, x: gx, y: gy};
  });

  // --- Relativize container positions → subgraph-relative ---
  const relativizedContainers: ContainerNode[] = updatedContainers.map((c) => {
    const key = c.logicalContainerId ?? c.id;
    const cg = containerGlobal.get(key);
    if (!cg) {
      return c;
    }
    const sg = subgraphGlobal.get(c.parentId ?? '');
    if (!sg) {
      return {...c, x: cg.x, y: cg.y};
    }
    return {...c, x: cg.x - sg.x, y: cg.y - sg.y};
  });

  // --- Relativize module positions → container-relative ---
  const relativizedModules: ModuleNode[] = modules.map((m) => {
    const gpos = positions.get(m.id);
    const cg = containerGlobal.get(m.parentId ?? '');
    const d = dims.get(m.id);
    if (!gpos || !cg) {
      logger.warn(
        'layoutLevelView: module has no container in layout — check parentId',
        {
          action: 'layout_level_view',
          component: 'levelViewLayout',
        },
      );
      return {
        ...m,
        height: d?.height ?? m.height,
        parentId: undefined,
        width: d?.width ?? m.width,
      };
    }
    return {
      ...m,
      height: d?.height ?? m.height,
      width: d?.width ?? m.width,
      x: gpos.x - cg.x,
      y: gpos.y - cg.y,
    };
  });

  // --- Subsystem positioning ---
  // Subsystems are opaque in the drill model; tile them after all subgraphs.
  const sgRight = [...subgraphGlobal.values()].reduce(
    (max, sg) => Math.max(max, sg.x + sg.width),
    0,
  );
  const ssStartX = subsystems.length > 0 ? sgRight + SP * 2 : 0;
  const updatedSubsystems: SubsystemNode[] = subsystems.map((ss, i) => ({
    ...ss,
    x: ssStartX + i * (ss.width + SP * 2),
    y: 0,
  }));

  return {
    containers: relativizedContainers,
    modules: relativizedModules,
    subgraphs: updatedSubgraphs,
    subsystems: updatedSubsystems,
  };
}

function enforceSubgraphGaps(
  subgraphs: SubgraphNode[],
  minGap: number,
): SubgraphNode[] {
  if (subgraphs.length <= 1) {
    return subgraphs;
  }

  // Process top-to-bottom so each subgraph is pushed past all preceding ones.
  const result = [...subgraphs].sort((a, b) =>
    a.y !== b.y ? a.y - b.y : a.x - b.x,
  );

  for (let i = 1; i < result.length; i++) {
    let sg = result[i];
    for (let j = 0; j < i; j++) {
      const prev = result[j];
      const xOverlap = sg.x < prev.x + prev.width && sg.x + sg.width > prev.x;
      const gap = sg.y - (prev.y + prev.height);
      if (xOverlap && gap < minGap) {
        sg = {...sg, y: prev.y + prev.height + minGap};
      }
    }
    result[i] = sg;
  }

  const byId = new Map(result.map((sg) => [sg.id, sg]));
  return subgraphs.map((sg) => byId.get(sg.id) ?? sg);
}

export async function layoutLevelView(graph: LevelView): Promise<LevelView> {
  const containers = graph.containers ?? [];
  const dataLinks = graph.dataLinks ?? [];
  const modules = graph.modules ?? [];
  const subgraphs = graph.subgraphs ?? [];
  const subsystems = graph.subsystems ?? [];
  const SP = NODE_DIMENSIONS.subgraph.padding;

  const dims = computeModuleDimensions(modules);
  const moduleToSubgraph = buildModuleToSubgraph(modules, containers);

  const modulesBySg = new Map<string, ModuleNode[]>();
  for (const m of modules) {
    const sgId = moduleToSubgraph.get(m.id);
    if (sgId) {
      if (!modulesBySg.has(sgId)) {
        modulesBySg.set(sgId, []);
      }
      modulesBySg.get(sgId)!.push(m);
    }
  }
  const containersBySg = new Map<string, ContainerNode[]>();
  for (const c of containers) {
    if (c.parentId) {
      if (!containersBySg.has(c.parentId)) {
        containersBySg.set(c.parentId, []);
      }
      containersBySg.get(c.parentId)!.push(c);
    }
  }
  const intraSgLinks = new Map<string, DataLink[]>();
  for (const link of dataLinks) {
    const srcSg = moduleToSubgraph.get(link.sourceNodeId);
    const tgtSg = moduleToSubgraph.get(link.targetNodeId);
    if (srcSg && srcSg === tgtSg) {
      if (!intraSgLinks.has(srcSg)) {
        intraSgLinks.set(srcSg, []);
      }
      intraSgLinks.get(srcSg)!.push(link);
    }
  }

  const allPositionedSgs: SubgraphNode[] = [];
  const allRelConts: ContainerNode[] = [];
  const allRelMods: ModuleNode[] = [];

  try {
    for (const sg of subgraphs) {
      const sgModules = modulesBySg.get(sg.id) ?? [];

      if (sgModules.length === 0) {
        allPositionedSgs.push(sg);
        allRelConts.push(...(containersBySg.get(sg.id) ?? []));
        continue;
      }

      const sgContainers = containersBySg.get(sg.id) ?? [];
      const sgLinks = intraSgLinks.get(sg.id) ?? [];

      const positions = await runSubgraphElkPass(
        sg.id,
        sgModules,
        sgLinks,
        dims,
      );

      const {containers: splitConts, modules: splitMods} = splitContainers(
        sgModules,
        sgContainers,
        positions,
      );

      const bbResult = computeBoundingBoxes(
        splitMods,
        splitConts,
        [sg],
        [],
        positions,
        dims,
      );

      allPositionedSgs.push(bbResult.subgraphs[0] ?? sg);
      allRelConts.push(...bbResult.containers);
      allRelMods.push(...bbResult.modules);
    }
  } catch (err) {
    logger.error(
      'layoutLevelView: elk.layout failed — returning unpositioned graph',
      {
        action: 'layout_level_view',
        component: 'levelViewLayout',
        error: err instanceof Error ? err.message : String(err),
      },
    );
    return graph;
  }

  const adj = buildInterSubgraphGraph(dataLinks, moduleToSubgraph);
  const cols = assignSubgraphColumns(
    subgraphs.map((sg) => sg.id),
    adj,
  );

  const colWidths = new Map<number, number>();
  for (const sg of allPositionedSgs) {
    const col = cols.get(sg.id) ?? 0;
    colWidths.set(col, Math.max(colWidths.get(col) ?? 0, sg.width));
  }

  const colX = new Map<number, number>();
  let xOffset = 0;
  for (const col of [...colWidths.keys()].sort((a, b) => a - b)) {
    colX.set(col, xOffset);
    xOffset += (colWidths.get(col) ?? 0) + SUBGRAPH_COLUMN_GAP;
  }

  const canvasPositionedSgs = allPositionedSgs.map((sg) => ({
    ...sg,
    x: colX.get(cols.get(sg.id) ?? 0) ?? 0,
    y: 0,
  }));

  const finalSubgraphs = enforceSubgraphGaps(canvasPositionedSgs, 50);

  const sgRight = finalSubgraphs.reduce(
    (max, sg) => Math.max(max, sg.x + sg.width),
    0,
  );
  const ssStartX = subsystems.length > 0 ? sgRight + SP * 2 : 0;
  const finalSubsystems = subsystems.map((ss, i) => {
    const width = Math.max(ss.width, NODE_DIMENSIONS.subsystem.width);
    const height = Math.max(ss.height, NODE_DIMENSIONS.subsystem.baseHeight);
    return {
      ...ss,
      height,
      width,
      x: ssStartX + i * (width + SP * 2),
      y: 0,
    };
  });

  return {
    ...graph,
    containers: allRelConts,
    modules: allRelMods,
    subgraphs: finalSubgraphs,
    subsystems: finalSubsystems,
  };
}
