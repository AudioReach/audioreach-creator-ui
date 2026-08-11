/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {endSession, startSession} from '~entities/edit-session';
import {getProjectById} from '~entities/project/api/projects-api';
import {SessionMode} from '~entities/project/model/session.dto';
import type {SubgraphPairResponseDto} from '~entities/subgraph-definitions/model/subgraph-response.dto';
import type {KeyValue} from '~entities/usecases';
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
  keyValuePairs: KeyValue[];
  selected: boolean;
  systemId: string;
}

export interface EditSessionSlice {
  beginMutation: () => void;
  clearStageProcessed: () => void;
  endMutation: () => void;
  enterEditMode: () => Promise<boolean>;
  excludedLinks: Connection[];
  exitEditMode: () => Promise<boolean>;
  isMutating: boolean;
  kvSelectionsById: Record<string, KvSelection[]>;
  mode: 'view' | 'edit';
  pairLinksById: Record<string, SubgraphPairResponseDto>;
  recordStageProcessed: (ids: string[]) => void;
  resetSessionLocalMaps: () => void;
  stagedProcessedChangeIds: string[];
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
  pairLinksById: {} as Record<string, SubgraphPairResponseDto>,
  stagedProcessedChangeIds: [] as string[],
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

    clearStageProcessed: (): void => {
      setSlice({stagedProcessedChangeIds: []});
    },

    endMutation: () => {
      logSession('endMutation', 'endMutation');
      setSlice({isMutating: false});
    },

    enterEditMode: async () => {
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

      const endResult = await endSession(projectId);
      if (!endResult.success) {
        const projectResult = await getProjectById(projectId);
        const alreadyEnded =
          projectResult.success &&
          projectResult.data?.sessionMode === SessionMode.Readonly;

        if (!alreadyEnded) {
          logSession(
            'enterEditMode rejected — endSession did not take effect',
            'enterEditMode',
          );
          projectStore.getState().releaseExclusiveMode(LOCK_OWNER);
          return false;
        }
      }

      const startResult = await startSession(projectId, SessionMode.Designer);
      if (!startResult.success) {
        logSession(
          'enterEditMode rejected — startSession failed',
          'enterEditMode',
        );
        projectStore.getState().releaseExclusiveMode(LOCK_OWNER);
        return false;
      }

      setSlice({
        mode: 'edit',
        usesSubsystemVariant: USES_SUBSYSTEM_VARIANT_STUB,
      });
      projectStore.getState().setEditModeState('edit');

      logSession('enterEditMode succeeded', 'enterEditMode');
      return true;
    },

    exitEditMode: async () => {
      const startResult = await startSession(projectId, SessionMode.Tuning);
      if (!startResult.success) {
        logSession(
          'exitEditMode rejected — startSession failed',
          'exitEditMode',
        );
        return false;
      }

      const projectStore = projectStoreRegistry.get(projectId);
      projectStore?.getState().releaseExclusiveMode(LOCK_OWNER);
      setSlice({...INITIAL_SESSION_LOCAL_STATE, mode: 'view'});
      projectStore?.getState().setEditModeState('view');

      logSession('exitEditMode succeeded', 'exitEditMode');
      return true;
    },

    isMutating: false,

    mode: 'view',

    recordStageProcessed: (ids: string[]): void => {
      setSlice((state) => {
        const current = state.stagedProcessedChangeIds;
        const newIds = ids.filter(
          (id, index) => !current.includes(id) && ids.indexOf(id) === index,
        );
        return {stagedProcessedChangeIds: [...current, ...newIds]};
      });
    },

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
