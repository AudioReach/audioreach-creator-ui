/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Graph search over the LevelView domain model.
 *
 * Prefix syntax:  <prefix>:<value>
 *   sg:   → Subgraph nodes  (by subgraphId or label)
 *   ss:   → Subsystem nodes (by numeric id or label)
 *   cnt:  → Container nodes (by containerId or label)
 *   mod:  → Module nodes    (by moduleId, instanceId, moduleType, alias, label)
 *
 * Value rules:
 *   - Starts with "0x" or is all digits → numeric ID search
 *   - Otherwise                         → case-insensitive label/name search
 */

import type {
  AnyNode,
  ContainerNode,
  LevelView,
  ModuleNode,
  SubgraphNode,
  SubsystemNode,
} from '~features/usecase-visualizer';
import {ConvertStringToNumber} from '~shared/utils/converter-utils';

const KNOWN_PREFIXES = ['cnt', 'mod', 'sg', 'ss'] as const;
export type SearchPrefix = (typeof KNOWN_PREFIXES)[number];

export interface ParsedSearchTerm {
  /** null = all-nodes search; 'invalid' = unrecognised prefix (return no results). */
  prefix: SearchPrefix | 'invalid' | null;
  /** The actual value to search for (after stripping the prefix) */
  value: string;
}

export interface SearchMatch {
  node: AnyNode;
  nodeId: string;
}

function numericSuffix(nodeId: string): number | null {
  const dash = nodeId.lastIndexOf('-');
  if (dash === -1) {
    return null;
  }
  const n = parseInt(nodeId.slice(dash + 1), 10);
  return Number.isFinite(n) ? n : null;
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
  node: SubgraphNode,
  value: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return node.subgraphId === numericValue;
  }
  return matchesName(node.label, value);
}

function matchesSubsystem(
  node: SubsystemNode,
  value: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return numericSuffix(node.id) === numericValue;
  }
  return matchesName(node.label, value);
}

function matchesContainer(
  node: ContainerNode,
  value: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return node.containerId === numericValue;
  }
  return matchesName(node.label, value);
}

function matchesModule(
  node: ModuleNode,
  value: string,
  numericValue: number | null,
): boolean {
  if (numericValue !== null) {
    return (
      numericSuffix(node.id) === numericValue || node.moduleId === numericValue
    );
  }
  return (
    matchesName(node.moduleType, value) ||
    matchesName(node.alias, value) ||
    matchesName(node.label, value)
  );
}

function matchesNode(
  node: AnyNode,
  prefix: SearchPrefix | null,
  value: string,
  numericValue: number | null,
): boolean {
  switch (node.nodeKind) {
    case 'subgraph':
      return (
        (prefix === null || prefix === 'sg') &&
        matchesSubgraph(node, value, numericValue)
      );
    case 'subsystem':
      return (
        (prefix === null || prefix === 'ss') &&
        matchesSubsystem(node, value, numericValue)
      );
    case 'container':
      return (
        (prefix === null || prefix === 'cnt') &&
        matchesContainer(node, value, numericValue)
      );
    case 'module':
      return (
        (prefix === null || prefix === 'mod') &&
        matchesModule(node, value, numericValue)
      );
    default:
      return false;
  }
}

function levelNodes(level: LevelView): AnyNode[] {
  return [
    ...(level.subsystems ?? []),
    ...(level.subgraphs ?? []),
    ...(level.containers ?? []),
    ...(level.modules ?? []),
  ];
}

function absolutePosition(
  node: AnyNode,
  byId: Map<string, AnyNode>,
): {x: number; y: number} {
  let x = node.x;
  let y = node.y;
  let current: AnyNode | undefined = node;
  while (current?.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) {
      break;
    }
    x += parent.x;
    y += parent.y;
    current = parent;
  }
  return {x, y};
}

/**
 * Search all nodes in a single LevelView and return position-sorted matches.
 * Returns an empty array when `searchTerm` is blank or uses an unknown prefix.
 */
export function searchLevelView(
  level: LevelView,
  searchTerm: string,
): SearchMatch[] {
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    return [];
  }
  const {prefix, value} = parseSearchTerm(trimmed);
  if (prefix === 'invalid') {
    return [];
  }
  const valueTrimmed = value.trim();
  if (!valueTrimmed) {
    return [];
  }
  const numericValue = ConvertStringToNumber(valueTrimmed);

  const nodes = levelNodes(level);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const matches = nodes.filter((n) =>
    matchesNode(n, prefix, valueTrimmed, numericValue),
  );

  matches.sort((a, b) => {
    const pa = absolutePosition(a, byId);
    const pb = absolutePosition(b, byId);
    if (Math.abs(pa.x - pb.x) > 1) {
      return pa.x - pb.x;
    }
    return pa.y - pb.y;
  });

  return matches.map((n) => ({node: n, nodeId: n.id}));
}

/** Subgraph id of the subgraph that directly contains this node, if any. */
function subgraphIdContaining(node: AnyNode): number | null {
  if (node.nodeKind === 'container') {
    const m = node.parentId?.match(/subgraph-(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }
  if (node.nodeKind === 'module') {
    const m = node.parentId?.match(/container-\d+:(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }
  return null;
}

/**
 * For matches that sit inside a collapsed subgraph, return the proxy node ids
 * that should receive the contains-match affordance.
 */
export function computeContainsMatchIds(
  matches: SearchMatch[],
  collapsedSubgraphs: Set<number>,
): string[] {
  const ids = new Set<string>();
  for (const match of matches) {
    const sgId = subgraphIdContaining(match.node);
    if (sgId !== null && collapsedSubgraphs.has(sgId)) {
      ids.add(`subgraph-proxy-${sgId}`);
    }
  }
  return Array.from(ids);
}
