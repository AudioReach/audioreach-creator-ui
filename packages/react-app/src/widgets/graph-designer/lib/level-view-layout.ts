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
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.spacing.nodeNode': '30',
};

const SUBGRAPH_COLUMN_GAP = 80;

type Dims = {height: number; width: number};
type SubgraphLayoutResult = {
  containers: ContainerNode[];
  modules: ModuleNode[];
  subgraph: SubgraphNode;
};

function elkPadding(
  top: number,
  left: number,
  bottom: number,
  right: number,
): string {
  return `[top=${top},left=${left},bottom=${bottom},right=${right}]`;
}

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
  subgraph: SubgraphNode,
  modules: ModuleNode[],
  containers: ContainerNode[],
  dataLinks: DataLink[],
  dims: Map<string, Dims>,
): Promise<SubgraphLayoutResult> {
  const {headerHeight: CH, padding: CP} = NODE_DIMENSIONS.container;
  const {
    headerHeight: SH,
    minWidth: SMW,
    padding: SP,
  } = NODE_DIMENSIONS.subgraph;

  const modulesByContainer = new Map<string, ModuleNode[]>();
  for (const m of modules) {
    const parentId = m.parentId ?? '';
    if (!modulesByContainer.has(parentId)) {
      modulesByContainer.set(parentId, []);
    }
    modulesByContainer.get(parentId)!.push(m);
  }

  const graph: ElkNode = {
    children: containers.map((container) => ({
      children: (modulesByContainer.get(container.id) ?? []).map((m) => {
        const d = dims.get(m.id) ?? {height: 80, width: 160};
        return {height: d.height, id: m.id, width: d.width};
      }),
      id: container.id,
      layoutOptions: {
        ...ELK_OPTIONS,
        'elk.padding': elkPadding(CH + CP, CP, CP, CP),
      },
    })),
    edges: dataLinks.map((e) => ({
      id: e.id,
      sources: [e.sourceNodeId],
      targets: [e.targetNodeId],
    })),
    id: subgraph.id,
    layoutOptions: {
      ...ELK_OPTIONS,
      'elk.padding': elkPadding(SH + SP, SP, SP, SP),
    },
  };

  const result = await elk.layout(graph);

  const elkContainers = new Map(
    (result.children ?? []).map((node) => [node.id, node]),
  );
  const updatedContainers = containers.map((container) => {
    const node = elkContainers.get(container.id);
    if (!node || node.x === undefined || node.y === undefined) {
      logger.warn('layoutLevelView: node missing from ELK result', {
        action: 'layout_level_view',
        component: 'levelViewLayout',
      });
      return container;
    }
    return {
      ...container,
      height: node.height ?? container.height,
      width: node.width ?? container.width,
      x: node.x,
      y: node.y,
    };
  });

  const elkModules = new Map<string, ElkNode>();
  for (const containerNode of result.children ?? []) {
    for (const moduleNode of containerNode.children ?? []) {
      elkModules.set(moduleNode.id, moduleNode);
    }
  }
  const updatedModules = modules.map((m) => {
    const node = elkModules.get(m.id);
    const d = dims.get(m.id);
    if (!node || node.x === undefined || node.y === undefined) {
      logger.warn('layoutLevelView: node missing from ELK result', {
        action: 'layout_level_view',
        component: 'levelViewLayout',
      });
      return {...m, height: d?.height ?? m.height, width: d?.width ?? m.width};
    }
    return {
      ...m,
      height: d?.height ?? m.height,
      width: d?.width ?? m.width,
      x: node.x,
      y: node.y,
    };
  });

  return {
    containers: updatedContainers,
    modules: updatedModules,
    subgraph: {
      ...subgraph,
      height: result.height ?? subgraph.height,
      width: Math.max(result.width ?? subgraph.width, SMW),
      x: 0,
      y: 0,
    },
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

      const layoutResult = await runSubgraphElkPass(
        sg,
        sgModules,
        sgContainers,
        sgLinks,
        dims,
      );

      allPositionedSgs.push(layoutResult.subgraph);
      allRelConts.push(...layoutResult.containers);
      allRelMods.push(...layoutResult.modules);
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

  let boundarySubsystem = graph.boundarySubsystem;
  if (boundarySubsystem) {
    const {bottomPadding, minHeight, minWidth, sidePadding, topInset} =
      NODE_DIMENSIONS.subsystemBoundary;
    const minX = Math.min(
      ...finalSubgraphs.map((node) => node.x),
      ...finalSubsystems.map((node) => node.x),
    );
    const minY = Math.min(
      ...finalSubgraphs.map((node) => node.y),
      ...finalSubsystems.map((node) => node.y),
    );
    const shiftX = Number.isFinite(minX) ? sidePadding - minX : 0;
    const shiftY = Number.isFinite(minY) ? topInset - minY : 0;
    const wrappedSubgraphs = finalSubgraphs.map((node) => ({
      ...node,
      parentId: boundarySubsystem!.id,
      x: node.x + shiftX,
      y: node.y + shiftY,
    }));
    const wrappedSubsystems = finalSubsystems.map((node) => ({
      ...node,
      parentId: boundarySubsystem!.id,
      x: node.x + shiftX,
      y: node.y + shiftY,
    }));
    const maxRight = Math.max(
      0,
      ...wrappedSubgraphs.map((node) => node.x + node.width),
      ...wrappedSubsystems.map((node) => node.x + node.width),
    );
    const maxBottom = Math.max(
      0,
      ...wrappedSubgraphs.map((node) => node.y + node.height),
      ...wrappedSubsystems.map((node) => node.y + node.height),
    );
    boundarySubsystem = {
      ...boundarySubsystem,
      height: Math.max(minHeight, maxBottom + bottomPadding),
      width: Math.max(minWidth, maxRight + sidePadding),
      x: 0,
      y: 0,
    };

    return {
      ...graph,
      boundarySubsystem,
      containers: allRelConts,
      modules: allRelMods,
      subgraphs: wrappedSubgraphs,
      subsystems: wrappedSubsystems,
    };
  }

  return {
    ...graph,
    containers: allRelConts,
    modules: allRelMods,
    subgraphs: finalSubgraphs,
    subsystems: finalSubsystems,
  };
}
