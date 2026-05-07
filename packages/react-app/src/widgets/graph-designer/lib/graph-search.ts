/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Graph search utility
 *
 * Supports prefix-based and default search across ReactFlow nodes.
 *
 * Prefix syntax:  <prefix>:<value>
 *   sg:   → Subgraph nodes  (by SubgraphId or SubgraphName)
 *   ss:   → Subsystem nodes (by SubsystemId or SubsystemName)
 *   cnt:  → Container nodes (by ContainerId, ContainerName, or label)
 *   mod:  → Module nodes    (by ModuleId, InstanceId, ModuleName, or AliasName)
 *
 * Value rules:
 *   - Starts with "0x" or is all digits → numeric ID search (via ConvertStringToNumber)
 *   - Otherwise                         → case-insensitive label/name search
 */

import {
  NODE_KIND,
  type RFContainerNodeData,
  type RFModuleNodeData,
  type RFNode,
  type RFSubgraphNodeData,
  type RFSubsystemNodeData,
} from '~features/usecase-visualizer/model/usecase-visualizer.types';
import {ConvertStringToNumber} from '~shared/utils/converter-utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const KNOWN_PREFIXES = ['sg', 'ss', 'cnt', 'mod'] as const;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the numeric ID embedded in a ReactFlow node ID string.
 *  Node ID formats: "subsystem-{id}", "subgraph-{id}", "module-{id}"
 */
function extractNumericNodeId(rfNodeId: string): number | null {
  const dashIdx = rfNodeId.lastIndexOf('-');
  if (dashIdx === -1) {
    return null;
  }
  const numStr = rfNodeId.slice(dashIdx + 1);
  const num = parseInt(numStr, 10);
  return Number.isFinite(num) ? num : null;
}

function matchesName(
  nodeName: string | undefined,
  searchTerm: string,
): boolean {
  if (!nodeName) {
    return false;
  }
  return nodeName.toLowerCase().includes(searchTerm.toLowerCase());
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

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
    : 'invalid'; // Unknown prefix → treat as invalid, not default search

  return {prefix, value};
}

// ---------------------------------------------------------------------------
// Per-kind matchers
// ---------------------------------------------------------------------------

function matchesSubgraph(
  node: RFNode,
  value: string,
  numericValue: number | null,
): boolean {
  const data = node.data as RFSubgraphNodeData;
  if (numericValue !== null) {
    const sgId = extractNumericNodeId(node.id);
    return sgId === numericValue;
  }
  return matchesName(data.label, value) || matchesName(data.name, value);
}

function matchesSubsystem(
  node: RFNode,
  value: string,
  numericValue: number | null,
): boolean {
  const data = node.data as RFSubsystemNodeData;
  if (numericValue !== null) {
    const ssId = extractNumericNodeId(node.id);
    return ssId === numericValue;
  }
  return matchesName(data.label, value) || matchesName(data.name, value);
}

function matchesContainer(
  node: RFNode,
  value: string,
  numericValue: number | null,
): boolean {
  const data = node.data as RFContainerNodeData;
  if (numericValue !== null) {
    return data.containerId === numericValue;
  }
  // String search: name or label (consistent with other node matchers)
  return matchesName(data.name, value) || matchesName(data.label, value);
}

function matchesModule(
  node: RFNode,
  value: string,
  numericValue: number | null,
): boolean {
  const data = node.data as RFModuleNodeData;
  if (numericValue !== null) {
    // Match by InstanceId (node.id) or ModuleId (data.moduleId)
    const instanceId = extractNumericNodeId(node.id);
    return instanceId === numericValue || data.moduleId === numericValue;
  }
  // String search: name, alias, or label
  return (
    matchesName(data.name, value) ||
    matchesName(data.alias, value) ||
    matchesName(data.label, value)
  );
}

// ---------------------------------------------------------------------------
// Sort matches by visual position
// ---------------------------------------------------------------------------

/**
 * Sort a set of matching nodes by their absolute canvas position
 * (left → right, then top → bottom).
 *
 * ReactFlow nodes use *relative* positions — each node's `position` is
 * relative to its parent. To determine the true visual order we walk the
 * full parent chain (module → container → subgraph → subsystem) and sum
 * the offsets to obtain the absolute canvas coordinate before sorting.
 *
 * @param matches  - The subset of nodes returned by `searchNodes`.
 * @param allNodes - The complete node list used to resolve parent positions.
 */
export function sortMatchesByPosition(
  matches: RFNode[],
  allNodes: RFNode[],
): RFNode[] {
  const nodesById = new Map(allNodes.map((n) => [n.id, n]));

  const getAbsolutePosition = (node: RFNode): {x: number; y: number} => {
    let x = node.position?.x ?? 0;
    let y = node.position?.y ?? 0;
    let current: RFNode = node;
    while (current.parentId) {
      const parent = nodesById.get(current.parentId);
      if (!parent) {
        break;
      }
      x += parent.position?.x ?? 0;
      y += parent.position?.y ?? 0;
      current = parent;
    }
    return {x, y};
  };

  return [...matches].sort((a, b) => {
    const posA = getAbsolutePosition(a);
    const posB = getAbsolutePosition(b);
    const xDiff = posA.x - posB.x;
    if (Math.abs(xDiff) > 1) {
      return xDiff;
    } // primary: left → right
    return posA.y - posB.y; // secondary: top → bottom
  });
}

// ---------------------------------------------------------------------------
// Main search function
// ---------------------------------------------------------------------------

/**
 * Filter `nodes` according to `searchTerm` and return the matching subset.
 * Returns an empty array when `searchTerm` is blank.
 */
export function searchNodes(nodes: RFNode[], searchTerm: string): RFNode[] {
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    return [];
  }

  const {prefix, value} = parseSearchTerm(trimmed);
  // Unknown prefix → reject the search entirely (return no results)
  if (prefix === 'invalid') {
    return [];
  }

  const valueTrimmed = value.trim();

  if (!valueTrimmed) {
    return [];
  }

  // Determine if the value is numeric (decimal or hex)
  const numericValue = ConvertStringToNumber(valueTrimmed);

  return nodes.filter((node) => {
    const kind = node.data.kind;

    switch (prefix) {
      case 'sg':
        return (
          kind === NODE_KIND.SUBGRAPH &&
          matchesSubgraph(node, valueTrimmed, numericValue)
        );

      case 'ss':
        return (
          kind === NODE_KIND.SUBSYSTEM &&
          matchesSubsystem(node, valueTrimmed, numericValue)
        );

      case 'cnt':
        return (
          kind === NODE_KIND.CONTAINER &&
          matchesContainer(node, valueTrimmed, numericValue)
        );

      case 'mod':
        return (
          kind === NODE_KIND.MODULE &&
          matchesModule(node, valueTrimmed, numericValue)
        );

      default:
        // Default search: all node kinds
        switch (kind) {
          case NODE_KIND.SUBGRAPH:
            return matchesSubgraph(node, valueTrimmed, numericValue);
          case NODE_KIND.SUBSYSTEM:
            return matchesSubsystem(node, valueTrimmed, numericValue);
          case NODE_KIND.CONTAINER:
            return matchesContainer(node, valueTrimmed, numericValue);
          case NODE_KIND.MODULE:
            return matchesModule(node, valueTrimmed, numericValue);
          default:
            return false;
        }
    }
  });
}
