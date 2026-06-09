/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ElkNode} from 'elkjs';
import ELK from 'elkjs/lib/elk.bundled.js';

import {
  calculateModuleHeight,
  type LevelView,
  NODE_DIMENSIONS,
  PORT_IO_TYPE,
} from '~features/usecase-visualizer';
import {logger} from '~shared/lib/logger';

const elk = new ELK();

const LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '50',
  'elk.padding': '[top=44,left=20,bottom=20,right=20]',
  'elk.spacing.nodeNode': '30',
};

function collectPositions(
  elkNode: ElkNode,
  map: Map<string, {height: number; width: number; x: number; y: number}>,
): void {
  if (elkNode.x !== undefined) {
    map.set(elkNode.id, {
      height: elkNode.height ?? 0,
      width: elkNode.width ?? 0,
      x: elkNode.x,
      y: elkNode.y ?? 0,
    });
  }
  for (const child of elkNode.children ?? []) {
    collectPositions(child, map);
  }
}

export async function layoutLevelView(graph: LevelView): Promise<LevelView> {
  const moduleElkNodes: Record<string, ElkNode> = {};
  for (const node of graph.modules ?? []) {
    const inputCount = node.ports.filter(
      (p) => p.portIoType === PORT_IO_TYPE.INPUT,
    ).length;
    const outputCount = node.ports.filter(
      (p) => p.portIoType === PORT_IO_TYPE.OUTPUT,
    ).length;
    moduleElkNodes[node.id] = {
      height: calculateModuleHeight(inputCount, outputCount, false),
      id: node.id,
      width: NODE_DIMENSIONS.module.minWidth,
    };
  }

  const containerElkNodes: Record<string, ElkNode> = {};
  for (const node of graph.containers ?? []) {
    containerElkNodes[node.id] = {
      children: (graph.modules ?? [])
        .filter((m) => m.parentId === node.id)
        .map((m) => moduleElkNodes[m.id]),
      height: 100,
      id: node.id,
      layoutOptions: LAYOUT_OPTIONS,
      width: 200,
    };
  }

  const subgraphElkNodes: Record<string, ElkNode> = {};
  for (const node of graph.subgraphs ?? []) {
    subgraphElkNodes[node.id] = {
      children: (graph.containers ?? [])
        .filter((c) => c.parentId === node.id)
        .map((c) => containerElkNodes[c.id]),
      height: 100,
      id: node.id,
      layoutOptions: LAYOUT_OPTIONS,
      width: 200,
    };
  }

  const subsystemElkNodes: ElkNode[] = (graph.subsystems ?? []).map((node) => ({
    children: (graph.subgraphs ?? [])
      .filter((sg) => sg.parentId === node.id)
      .map((sg) => subgraphElkNodes[sg.id]),
    height: 100,
    id: node.id,
    layoutOptions: LAYOUT_OPTIONS,
    width: 200,
  }));

  // Subgraphs with no subsystem parent sit directly under root.
  const rootSubgraphs = (graph.subgraphs ?? [])
    .filter((sg) => sg.parentId === undefined)
    .map((sg) => subgraphElkNodes[sg.id]);

  const elkGraph: ElkNode = {
    children: [...subsystemElkNodes, ...rootSubgraphs],
    edges: [
      ...(graph.dataLinks ?? []).map((e) => ({
        id: e.id,
        sources: [e.sourceNodeId],
        targets: [e.targetNodeId],
      })),
      ...(graph.controlLinks ?? []).map((e) => ({
        id: e.id,
        sources: [e.sourceNodeId],
        targets: [e.targetNodeId],
      })),
    ],
    id: graph.levelId,
    layoutOptions: LAYOUT_OPTIONS,
  };

  try {
    const result = await elk.layout(elkGraph);

    const pos = new Map<
      string,
      {height: number; width: number; x: number; y: number}
    >();
    collectPositions(result, pos);

    const applyPos = <T extends {id: string}>(n: T) => {
      if (!pos.has(n.id)) {
        logger.warn('layoutLevelView: node missing from ELK result', {
          action: 'layout_level_view',
          component: 'levelViewLayout',
        });
      }
      return {...n, ...(pos.get(n.id) ?? {})};
    };

    return {
      ...graph,
      containers: graph.containers?.map(applyPos),
      modules: graph.modules?.map(applyPos),
      subgraphs: graph.subgraphs?.map(applyPos),
      subsystems: graph.subsystems?.map(applyPos),
    };
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
}
