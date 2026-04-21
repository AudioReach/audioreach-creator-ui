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
 *   cnt:  → Container nodes (by ContainerId only)
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

export type SearchPrefix = 'sg' | 'ss' | 'cnt' | 'mod';

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

/** Returns true if `nodeName` contains `searchTerm` (case-insensitive). */
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

/**
 * Parse a raw search term into a prefix + value pair.
 * If the term contains ":" the part before the first ":" is treated as the
 * prefix (case-insensitive).  Unknown prefixes are marked as `'invalid'`
 * and will produce no search results.
 */
export function parseSearchTerm(rawSearchTerm: string): ParsedSearchTerm {
  const colonIdx = rawSearchTerm.indexOf(':');
  if (colonIdx === -1) {
    return {prefix: null, value: rawSearchTerm};
  }

  const prefixRaw = rawSearchTerm.slice(0, colonIdx).trim().toLowerCase();
  const value = rawSearchTerm.slice(colonIdx + 1);

  // This array is just a runtime list of all valid prefix strings.
  // TypeScript's union types only exist at compile time — they disappear at runtime
  const knownPrefixes: SearchPrefix[] = ['sg', 'ss', 'cnt', 'mod'];
  const prefix: SearchPrefix | 'invalid' = knownPrefixes.includes(
    prefixRaw as SearchPrefix,
  )
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
  _value: string,
  numericValue: number | null,
): boolean {
  // Containers are matched by ContainerId only
  if (numericValue === null) {
    return false;
  }
  const data = node.data as RFContainerNodeData;
  return data.containerId === numericValue;
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
// Main search function
// ---------------------------------------------------------------------------

/**
 * Filter `nodes` according to `searchTerm` and return the matching subset.
 *
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
