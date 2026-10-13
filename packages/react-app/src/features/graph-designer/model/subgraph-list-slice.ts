/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {
  getAllSubgraphs,
  type SubgraphResponseDto,
} from '~entities/subgraph-definitions';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {logger} from '~shared/lib/logger';
import type {SliceStatus} from '~shared/store/global-store.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubgraphDefinition {
  category: string;
  description: string;
  naturalId: number;
  subgraphName: string;
  subgraphType: string;
  systemId: string;
}

export interface SubgraphListSlice {
  loadSubgraphList: () => Promise<void>;
  mergeSubgraphDetails: (subgraphs: SubgraphResponseDto[]) => void;
  selectedSubgraphTypes: string[];
  setSelectedSubgraphTypes: (types: string[]) => void;
  setSubgraphListSearchQuery: (query: string) => void;
  subgraphDetailsById: Record<string, SubgraphResponseDto>;
  subgraphList: SubgraphDefinition[];
  subgraphListSearchQuery: string;
  subgraphListStatus: SliceStatus;
  updateCachedSubgraphName: (subgraphSystemId: string, name: string) => void;
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
    naturalId: dto.naturalId,
    subgraphName: dto.name ?? '',
    subgraphType: dto.subGraphSharedType,
    systemId: dto.systemId,
  };
}

function toSubgraphDetailsById(
  subgraphs: SubgraphResponseDto[],
): Record<string, SubgraphResponseDto> {
  return Object.fromEntries(
    subgraphs.map((subgraph) => [subgraph.systemId, subgraph]),
  );
}

function toSubgraphList(
  subgraphDetailsById: Record<string, SubgraphResponseDto>,
): SubgraphDefinition[] {
  return Object.values(subgraphDetailsById).map(toSubgraphDefinition);
}

function isSubgraphType(value: unknown): value is string {
  return typeof value === 'string';
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

        if (hasBlockingIssues(result) || !result.data) {
          logger.error('subgraphListSlice: loadSubgraphList — API error', {
            action: 'load_subgraph_list',
            component: 'subgraphListSlice',
            error: getIssueMessage(result, 'Failed to load subgraph list'),
          });
          setSlice({subgraphListStatus: 'error'});
          return;
        }

        const subgraphDetailsById = toSubgraphDetailsById(result.data);
        const subgraphs = toSubgraphList(subgraphDetailsById);
        const allSubgraphTypes = [
          ...new Set(
            subgraphs.map((s) => s.subgraphType).filter(isSubgraphType),
          ),
        ].sort();
        const cachedSubgraphTypes =
          subgraphFilterCache.get(projectId)?.filter(isSubgraphType);

        setSlice({
          selectedSubgraphTypes: cachedSubgraphTypes ?? allSubgraphTypes,
          subgraphDetailsById,
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

    mergeSubgraphDetails: (subgraphs: SubgraphResponseDto[]) => {
      const subgraphDetailsById = {
        ..._get().subgraphDetailsById,
        ...toSubgraphDetailsById(subgraphs),
      };

      setSlice({
        subgraphDetailsById,
        subgraphList: toSubgraphList(subgraphDetailsById),
      });
    },

    selectedSubgraphTypes: [],

    setSelectedSubgraphTypes: (types: string[]) => {
      const validTypes = types.filter(isSubgraphType);
      subgraphFilterCache.set(projectId, validTypes);
      setSlice({selectedSubgraphTypes: validTypes});
    },

    setSubgraphListSearchQuery: (query: string) => {
      logger.debug('subgraphListSlice: setSubgraphListSearchQuery', {
        action: 'set_subgraph_list_search_query',
        component: 'subgraphListSlice',
      });
      setSlice({subgraphListSearchQuery: query});
    },

    subgraphDetailsById: {},

    subgraphList: [],

    subgraphListSearchQuery: '',

    subgraphListStatus: 'uninitialized',

    updateCachedSubgraphName: (subgraphSystemId: string, name: string) => {
      const current = _get().subgraphDetailsById;
      const existing = current[subgraphSystemId];
      if (!existing) {
        return;
      }

      const subgraphDetailsById = {
        ...current,
        [subgraphSystemId]: {...existing, name},
      };

      setSlice({
        subgraphDetailsById,
        subgraphList: toSubgraphList(subgraphDetailsById),
      });
    },
  };
}
