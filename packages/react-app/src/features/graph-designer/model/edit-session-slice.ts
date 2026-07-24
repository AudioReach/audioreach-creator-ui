/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import type {SubgraphPairDto} from '~entities/subgraph-definitions/model/subgraph-definition.dto';
import type {KeyValueInfo} from '~entities/usecases';
import {logger} from '~shared/lib/logger';
import {projectStoreRegistry} from '~shared/store/project-store-registry';

import type {Connection} from './graph-data-slice';

/**
 * Where a subgraph currently on canvas came from this edit session
 */
export type SubgraphProvenance =
  | 'newly-created'
  | 'palette-placed'
  | 'pre-loaded';

/** One selectable KV *selection* a subgraph supports — a whole Key+Value
 *  combination offered as a unit, not an individually toggleable pair
 */
export interface KvSelection {
  keyValuePairs: KeyValueInfo[];
  selected: boolean;
  systemId: string;
}

export interface EditSessionSlice {
  beginMutation: () => void;
  endMutation: () => void;
  enterEditMode: () => boolean;
  excludedLinks: Connection[];
  exitEditMode: () => void;
  isMutating: boolean;
  kvSelectionsById: Record<string, KvSelection[]>;
  mode: 'view' | 'edit';
  pairLinksById: Record<string, SubgraphPairDto>;
  resetSessionLocalMaps: () => void;
  subgraphProvenanceById: Record<string, SubgraphProvenance>;
  /** Fixed for the lifetime of the edit session, set in `enterEditMode()`. */
  usesSubsystemVariant: boolean;
}

type SetState<T> = StoreApi<T>['setState'];

const USES_SUBSYSTEM_VARIANT_STUB = false;

const LOCK_OWNER = 'usecase-edit';

const INITIAL_SESSION_LOCAL_STATE = {
  excludedLinks: [] as Connection[],
  kvSelectionsById: {} as Record<string, KvSelection[]>,
  pairLinksById: {} as Record<string, SubgraphPairDto>,
  subgraphProvenanceById: {} as Record<string, SubgraphProvenance>,
};

/**
 * Creates the edit-session slice for composing into the Graph Designer tab
 * store. Holds session bookkeeping only (mode, exclusive lock, the single
 * serial mutation flag) — no graph data of its own.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @param projectId - Project identifier this session's exclusive lock is scoped to.
 */
export function createEditSessionSlice<S extends EditSessionSlice>(
  set: SetState<S>,
  projectId: string,
): EditSessionSlice {
  const setSlice = set as SetState<EditSessionSlice>;
  const logSession = (message: string, action: string): void => {
    logger.debug(`editSessionSlice: ${message}`, {
      action,
      component: 'editSessionSlice',
      projectId,
    });
  };

  return {
    beginMutation: () => {
      logSession('beginMutation', 'beginMutation');
      setSlice({isMutating: true});
    },

    endMutation: () => {
      logSession('endMutation', 'endMutation');
      setSlice({isMutating: false});
    },

    enterEditMode: () => {
      const projectStore = projectStoreRegistry.get(projectId);
      if (!projectStore) {
        logSession(
          'enterEditMode rejected — no project store',
          'enterEditMode',
        );
        return false;
      }

      const acquired = projectStore
        .getState()
        .setActiveExclusiveMode(LOCK_OWNER);

      if (!acquired) {
        logSession(
          'enterEditMode rejected — lock unavailable',
          'enterEditMode',
        );
        return false;
      }

      setSlice({
        mode: 'edit',
        usesSubsystemVariant: USES_SUBSYSTEM_VARIANT_STUB,
      });

      logSession('enterEditMode succeeded', 'enterEditMode');
      return true;
    },

    exitEditMode: () => {
      projectStoreRegistry
        .get(projectId)
        ?.getState()
        .releaseExclusiveMode(LOCK_OWNER);
      setSlice({mode: 'view'});

      logSession('exitEditMode', 'exitEditMode');
    },

    isMutating: false,

    mode: 'view',

    resetSessionLocalMaps: (): void => {
      setSlice(INITIAL_SESSION_LOCAL_STATE);
    },

    usesSubsystemVariant: USES_SUBSYSTEM_VARIANT_STUB,

    ...INITIAL_SESSION_LOCAL_STATE,
  };
}

/**
 * Runs `action` under the mutation lock, releasing it in a
 * `finally` block even if `action` throws.
 *
 * @param get - Zustand get function for a store composing `EditSessionSlice`.
 * @param action - The backend call (or other async work) to run under the lock.
 */
export async function withMutationLock<S extends EditSessionSlice, T>(
  get: StoreApi<S>['getState'],
  action: () => Promise<T>,
): Promise<T> {
  const {beginMutation, endMutation, isMutating, mode} = get();
  if (mode !== 'edit') {
    throw new Error('withMutationLock called outside Edit mode');
  }
  if (isMutating) {
    throw new Error('withMutationLock called while a mutation is active');
  }

  beginMutation();
  try {
    return await action();
  } finally {
    endMutation();
  }
}
