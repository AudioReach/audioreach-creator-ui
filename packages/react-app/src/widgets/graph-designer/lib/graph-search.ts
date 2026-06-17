/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  Container,
  ModuleInstance,
  Subgraph,
  Subsystem,
  UsecaseGraphData,
} from '~features/graph-designer/model/graph-data-slice';
import type {SearchHighlights} from '~features/usecase-visualizer';
import {ConvertStringToNumber} from '~shared/utils/converter-utils';

import {containerNodeId, subgraphNodeId} from './node-id';

const KNOWN_PREFIXES = ['cnt', 'mod', 'sg', 'ss'] as const;
export type SearchPrefix = (typeof KNOWN_PREFIXES)[number];

export interface ParsedSearchTerm {
  /** null = all-nodes search; 'invalid' = unrecognised prefix (return no results). */
  prefix: SearchPrefix | 'invalid' | null;
  /** The actual value to search for (after stripping the prefix) */
  value: string;
}

function matchesName(name: string | undefined, termLower: string): boolean {
  if (!name) {
    return false;
  }
  return name.toLowerCase().includes(termLower);
}

export function parseSearchTerm(rawSearchTerm: string): ParsedSearchTerm {
  const colonIdx = rawSearchTerm.indexOf(':');
  if (colonIdx === -1) {
    return {prefix: null, value: rawSearchTerm};
  }

  const prefixRaw = rawSearchTerm.slice(0, colonIdx).trim().toLowerCase();
  const value = rawSearchTerm.slice(colonIdx + 1);

  const prefix: SearchPrefix | 'invalid' = (
    KNOWN_PREFIXES as readonly string[]
  ).includes(prefixRaw)
    ? (prefixRaw as SearchPrefix)
    : 'invalid';

  return {prefix, value};
}

function matchesSubgraph(
  node: Subgraph,
  valueLower: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return Number(node.subgraphId) === numericValue;
  }
  return matchesName(node.subgraphName, valueLower);
}

function matchesSubsystem(
  node: Subsystem,
  valueLower: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return Number(node.subsystemId) === numericValue;
  }
  return (
    matchesName(node.subsystemName, valueLower) ||
    matchesName(node.subsystemId, valueLower)
  );
}

function matchesContainer(
  node: Container,
  valueLower: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return Number(node.containerId) === numericValue;
  }
  return matchesName(node.containerName, valueLower);
}

function matchesModule(
  node: ModuleInstance,
  valueLower: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return Number(node.moduleId) === numericValue;
  }
  return (
    matchesName(node.displayName, valueLower) ||
    matchesName(node.moduleName, valueLower) ||
    matchesName(node.moduleType, valueLower)
  );
}

function emptyHighlights(): SearchHighlights {
  return {activeId: undefined, containsMatchNodeIds: [], highlightedIds: []};
}

/**
 * Search all nodes in GraphData and return SearchHighlights.
 * Returns empty highlights when `term` is blank or uses an unknown prefix.
 *
 * Node IDs in the returned highlights use LevelView composite ID format so
 * they align with what UsecaseVisualizer renders.
 */
export function searchGraphData(
  graphData: UsecaseGraphData,
  term: string,
): SearchHighlights {
  const trimmed = term.trim();
  if (!trimmed) {
    return emptyHighlights();
  }

  const {prefix, value} = parseSearchTerm(trimmed);
  if (prefix === 'invalid') {
    return emptyHighlights();
  }

  const valueTrimmed = value.trim();
  if (!valueTrimmed) {
    return emptyHighlights();
  }

  const numericValue = ConvertStringToNumber(valueTrimmed);
  const valueLower = valueTrimmed.toLowerCase();

  // sg and ss are hierarchy roots — no ancestor walk needed.
  if (prefix === 'sg') {
    const ids = Object.values(graphData.subgraphs)
      .filter((n) => matchesSubgraph(n, valueLower, numericValue))
      .map((n) => subgraphNodeId(n.subgraphId));
    return ids.length === 0
      ? emptyHighlights()
      : {activeId: ids[0], containsMatchNodeIds: [], highlightedIds: ids};
  }
  if (prefix === 'ss') {
    const ids = Object.values(graphData.subsystems)
      .filter((n) => matchesSubsystem(n, valueLower, numericValue))
      .map((n) => n.subsystemId);
    return ids.length === 0
      ? emptyHighlights()
      : {activeId: ids[0], containsMatchNodeIds: [], highlightedIds: ids};
  }

  const allContainers = Object.values(graphData.containers);
  const allModules = Object.values(graphData.moduleInstances);

  const cntIds = allContainers
    .filter((n) => matchesContainer(n, valueLower, numericValue))
    .map((n) => containerNodeId(n.containerId, n.subgraphId));
  const modIds = allModules
    .filter((n) => matchesModule(n, valueLower, numericValue))
    .map((n) => n.moduleInstanceId);

  let matchedIds: string[];
  switch (prefix) {
    case 'cnt':
      matchedIds = cntIds;
      break;
    case 'mod':
      matchedIds = modIds;
      break;
    default: {
      const sgIds = Object.values(graphData.subgraphs)
        .filter((n) => matchesSubgraph(n, valueLower, numericValue))
        .map((n) => subgraphNodeId(n.subgraphId));
      const ssIds = Object.values(graphData.subsystems)
        .filter((n) => matchesSubsystem(n, valueLower, numericValue))
        .map((n) => n.subsystemId);
      matchedIds = [...sgIds, ...ssIds, ...cntIds, ...modIds];
    }
  }

  if (matchedIds.length === 0) {
    return emptyHighlights();
  }

  // Build parent map: LevelView node ID → parent LevelView node ID.
  // Hierarchy: moduleInstance → container → subgraph.
  // Ancestry stops at the subgraph level — ss: searches are handled as early
  // returns above, so subsystems never appear as ancestors in this map.
  const parentMap = new Map<string, string>();
  for (const m of allModules) {
    parentMap.set(
      m.moduleInstanceId,
      containerNodeId(m.containerId, m.subgraphId),
    );
  }
  for (const c of allContainers) {
    parentMap.set(
      containerNodeId(c.containerId, c.subgraphId),
      subgraphNodeId(c.subgraphId),
    );
  }

  const ancestorIds = new Set<string>();
  for (const id of matchedIds) {
    let parentId = parentMap.get(id);
    while (parentId !== undefined) {
      ancestorIds.add(parentId);
      parentId = parentMap.get(parentId);
    }
  }

  return {
    activeId: matchedIds[0],
    containsMatchNodeIds: [...ancestorIds],
    highlightedIds: matchedIds,
  };
}
