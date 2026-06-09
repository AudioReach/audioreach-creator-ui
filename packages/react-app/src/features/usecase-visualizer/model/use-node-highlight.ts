/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useVisualizerStore} from './visualizer-store-context';

export interface NodeHighlight {
  /** CSS value for backgroundColor when the node is active-highlighted. */
  activeBackgroundColor: string;
  /** CSS value for borderColor derived from highlight state. */
  borderColor: string;
  /** Tailwind class to append when the node is a contains-match ancestor. */
  containsMatchClass: string;
  /** Tailwind class to append when this node is the active search result. */
  highlightActiveClass: string;
  /** Tailwind class to append when this node is a search match. */
  highlightMatchClass: string;
  /** True when this node is a contains-match ancestor of the active result. */
  isContainsMatch: boolean;
  /** Whether any search highlight is applied ('match' | 'active' | 'none'). */
  state: 'active' | 'match' | 'none';
}

/**
 * Returns search-highlight derived values for a single visualizer node.
 * Centralises the two store selectors and the style/class derivations that
 * would otherwise be duplicated across every node component.
 */
export function useNodeHighlight(nodeId: string): NodeHighlight {
  const state = useVisualizerStore(
    (s) => s.searchHighlightById[nodeId] ?? 'none',
  );
  const isContainsMatch = useVisualizerStore((s) =>
    s.containsMatchNodeIds.includes(nodeId),
  );

  return {
    activeBackgroundColor: 'var(--color-background-support-info-subtle)',
    borderColor:
      state !== 'none'
        ? 'var(--color-border-support-info)'
        : 'var(--color-border-neutral-10)',
    containsMatchClass: isContainsMatch ? 'search-contains-match' : '',
    highlightActiveClass: state === 'active' ? 'search-highlight-active' : '',
    highlightMatchClass: state === 'match' ? 'search-highlight-match' : '',
    isContainsMatch,
    state,
  };
}
