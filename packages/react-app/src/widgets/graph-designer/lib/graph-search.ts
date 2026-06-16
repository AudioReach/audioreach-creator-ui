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
  /**
   * Prefix scope, or null for default (all nodes) search.
   * Set to `'invalid'` when the input contains ":" but the prefix is not
   * a recognised SearchPrefix — the search should return no results.
   */
  prefix: SearchPrefix | 'invalid' | null;
  /** The actual value to search for (after stripping the prefix) */
  value: string;
}

function matchesName(name: string | undefined, term: string): boolean {
  if (!name) {
    return false;
  }
  return name.toLowerCase().includes(term.toLowerCase());
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
  value: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return Number(node.subgraphId) === numericValue;
  }
  return matchesName(node.subgraphName, value);
}

function matchesSubsystem(
  node: Subsystem,
  value: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return node.id === numericValue;
  }
  return (
    matchesName(node.subsystemName, value) ||
    matchesName(node.subsystemId, value)
  );
}

function matchesContainer(
  node: Container,
  value: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return Number(node.containerId) === numericValue;
  }
  return matchesName(node.containerName, value);
}

function matchesModule(
  node: ModuleInstance,
  value: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return Number(node.moduleId) === numericValue;
  }
  return (
    matchesName(node.displayName, value) ||
    matchesName(node.moduleName, value) ||
    matchesName(node.moduleType, value)
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

  const allSubgraphs = Object.values(graphData.subgraphs);
  const allSubsystems = Object.values(graphData.subsystems);
  const allContainers = Object.values(graphData.containers);
  const allModules = Object.values(graphData.moduleInstances);

  let matchedIds: string[];

  switch (prefix) {
    case 'sg':
      matchedIds = allSubgraphs
        .filter((n) => matchesSubgraph(n, valueTrimmed, numericValue))
        .map((n) => subgraphNodeId(n.subgraphId));
      break;
    case 'ss':
      matchedIds = allSubsystems
        .filter((n) => matchesSubsystem(n, valueTrimmed, numericValue))
        .map((n) => n.subsystemId);
      break;
    case 'cnt':
      matchedIds = allContainers
        .filter((n) => matchesContainer(n, valueTrimmed, numericValue))
        .map((n) => containerNodeId(n.containerId, n.subgraphId));
      break;
    case 'mod':
      matchedIds = allModules
        .filter((n) => matchesModule(n, valueTrimmed, numericValue))
        .map((n) => n.moduleInstanceId);
      break;
    default:
      matchedIds = [
        ...allSubgraphs
          .filter((n) => matchesSubgraph(n, valueTrimmed, numericValue))
          .map((n) => subgraphNodeId(n.subgraphId)),
        ...allSubsystems
          .filter((n) => matchesSubsystem(n, valueTrimmed, numericValue))
          .map((n) => n.subsystemId),
        ...allContainers
          .filter((n) => matchesContainer(n, valueTrimmed, numericValue))
          .map((n) => containerNodeId(n.containerId, n.subgraphId)),
        ...allModules
          .filter((n) => matchesModule(n, valueTrimmed, numericValue))
          .map((n) => n.moduleInstanceId),
      ];
  }

  if (matchedIds.length === 0) {
    return emptyHighlights();
  }

  // sg and ss nodes are hierarchy roots — no ancestor walk needed.
  if (prefix === 'sg' || prefix === 'ss') {
    return {
      activeId: matchedIds[0],
      containsMatchNodeIds: [],
      highlightedIds: matchedIds,
    };
  }

  // Build parent map: LevelView node ID → parent LevelView node ID.
  // Hierarchy: moduleInstance → container → subgraph.
  // Subgraph → subsystem link is absent from UsecaseGraphData (Subsystem.subgraphs
  // is not populated by the API builder), so that edge is omitted.
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
