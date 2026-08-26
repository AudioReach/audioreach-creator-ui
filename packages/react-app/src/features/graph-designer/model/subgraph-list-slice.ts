/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {
  getAllSubgraphs,
  type SubgraphResponseDto,
} from '~entities/subgraph-definitions';
import {logger} from '~shared/lib/logger';
import type {SliceStatus} from '~shared/store/global-store.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubgraphDefinition {
  category: string;
  description: string;
  subgraphId: string;
  subgraphName: string;
  subgraphType: string;
  systemId: string;
}

export interface SubgraphListSlice {
  loadSubgraphList: () => Promise<void>;
  selectedSubgraphTypes: string[];
  setSelectedSubgraphTypes: (types: string[]) => void;
  setSubgraphListSearchQuery: (query: string) => void;
  subgraphList: SubgraphDefinition[];
  subgraphListSearchQuery: string;
  subgraphListStatus: SliceStatus;
}

type SetState<T> = StoreApi<T>['setState'];
type GetState<T> = StoreApi<T>['getState'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Module-level filter cache: projectId → user-selected subgraph type filters.
// Lives outside the slice so filter choices survive tab store recreation.
const subgraphFilterCache = new Map<string, string[]>();

/** @internal Called only from the graph-designer tab store factory in index.ts. */
export function evictSubgraphListFilterCache(projectId: string): void {
  subgraphFilterCache.delete(projectId);
}

function toSubgraphDefinition(dto: SubgraphResponseDto): SubgraphDefinition {
  return {
    category: '',
    description: '',
    subgraphId: String(dto.id),
    subgraphName: dto.name,
    subgraphType: dto.subGraphSharedType,
    systemId: dto.systemId,
  };
}

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/**
 * Creates the subgraph-list slice for composing into a tab store.
 *
 * The slice starts `'uninitialized'` and loads lazily when the palette is
 * first opened. Both GraphDesignerStore and DiffMergeStore (graph-data edit
 * mode) include this slice.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @param _get - Zustand get function bound to the parent store state.
 * @returns The initial state and actions for the subgraph-list slice.
 */
export function createSubgraphListSlice(
  set: SetState<SubgraphListSlice>,
  _get: GetState<SubgraphListSlice>,
  projectId: string,
): SubgraphListSlice {
  const setSlice = set;
  return {
    loadSubgraphList: async () => {
      logger.debug('subgraphListSlice: loadSubgraphList — starting', {
        action: 'load_subgraph_list',
        component: 'subgraphListSlice',
      });

      setSlice({subgraphListStatus: 'loading'});

      try {
        const result = await getAllSubgraphs(projectId);

        if (!result.success || !result.data) {
          logger.error('subgraphListSlice: loadSubgraphList — API error', {
            action: 'load_subgraph_list',
            component: 'subgraphListSlice',
            error: result.message,
          });
          setSlice({subgraphListStatus: 'error'});
          return;
        }

        const subgraphs = result.data.map(toSubgraphDefinition);
        const allSubgraphTypes = [
          ...new Set(subgraphs.map((s) => s.subgraphType)),
        ].sort();

        setSlice({
          selectedSubgraphTypes:
            subgraphFilterCache.get(projectId) ?? allSubgraphTypes,
          subgraphList: subgraphs,
          subgraphListStatus: 'ready',
        });

        logger.debug('subgraphListSlice: loadSubgraphList — ready', {
          action: 'load_subgraph_list',
          component: 'subgraphListSlice',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        logger.error('subgraphListSlice: loadSubgraphList — failed', {
          action: 'load_subgraph_list',
          component: 'subgraphListSlice',
          error: message,
        });

        setSlice({subgraphListStatus: 'error'});
      }
    },

    selectedSubgraphTypes: [],

    setSelectedSubgraphTypes: (types: string[]) => {
      subgraphFilterCache.set(projectId, types);
      setSlice({selectedSubgraphTypes: types});
    },

    setSubgraphListSearchQuery: (query: string) => {
      logger.debug('subgraphListSlice: setSubgraphListSearchQuery', {
        action: 'set_subgraph_list_search_query',
        component: 'subgraphListSlice',
      });
      setSlice({subgraphListSearchQuery: query});
    },

    subgraphList: [],

    subgraphListSearchQuery: '',

    subgraphListStatus: 'uninitialized',
  };
}
