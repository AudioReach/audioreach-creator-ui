/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {endSession, startSession} from '~entities/edit-session';
import {
  getAllKeyDefinitions,
  type KeyDefinitionResponseDto,
} from '~entities/key-definitions';
import {getProjectById, SessionMode} from '~entities/project';
import {
  areKvVectorsEqual,
  type KvSelection,
  type SubgraphKvPair,
} from '~entities/subgraph-definitions';
import type {SubgraphPairResponseDto} from '~entities/subgraph-definitions/model/subgraph-response.dto';
import {hasBlockingIssues} from '~shared/api';
import {logger} from '~shared/lib/logger';
import {projectStoreRegistry} from '~shared/store/project-store-registry';

import {getKvVectorSignature} from '../lib/subgraph-kv-mapping';
import type {Connection, UsecaseGraphData} from './graph-data-slice';

/**
 * Owns graph changes that exist only between Edit entry and Apply/Discard.
 * SGKV vectors are copied from the read-only graph here so Add, Delete, and
 * selection changes can be staged without changing the Graph Data snapshot.
 */
/** Records how each subgraph currently on canvas entered the edit session. */
export type SubgraphProvenance =
  'newly-created' | 'palette-placed' | 'pre-loaded';

export interface EditSessionSlice {
  /** Adds a selected, locally deletable vector to one editable subgraph. */
  addSgKvVector: (
    subgraphSystemId: string,
    keyValuePairs: SubgraphKvPair[],
  ) => boolean;
  availableGraphKeys: KeyDefinitionResponseDto[] | null;
  beginMutation: () => void;
  clearStageProcessed: () => void;
  /** Deletes a locally added vector; persisted vectors are deliberately retained. */
  deleteSgKvVector: (subgraphSystemId: string, vectorSystemId: string) => void;
  endMutation: () => void;
  /** Starts the backend edit session and seeds editable SGKV state. */
  enterEditMode: () => Promise<boolean>;
  excludedLinks: Connection[];
  exitEditMode: () => Promise<boolean>;
  isMutating: boolean;
  kvSelectionsById: Record<string, KvSelection[]>;
  mode: 'view' | 'edit';
  pairLinksById: Record<string, SubgraphPairResponseDto>;
  pruneSessionLocalMapsForSubgraph: (subgraphId: string) => void;
  recordStageProcessed: (ids: string[]) => void;
  resetSessionLocalMaps: () => void;
  /** Updates one staged vector's Apply eligibility. */
  setSgKvVectorSelected: (
    subgraphSystemId: string,
    vectorSystemId: string,
    selected: boolean,
  ) => void;
  setSubgraphProvenance: (
    subgraphId: string,
    provenance: SubgraphProvenance,
  ) => void;
  stagedProcessedChangeIds: string[];
  subgraphProvenanceById: Record<string, SubgraphProvenance>;
  /** Reconciles refreshed derived metadata without discarding local edits. */
  updateSgKvConfigInfo: (
    vectorsBySubgraphId: Record<string, KvSelection[]>,
  ) => void;
  /** Fixed for the lifetime of the edit session, set in `enterEditMode()`. */
  usesSubsystemVariant: boolean;
}

type SetState<T> = StoreApi<T>['setState'];

const USES_SUBSYSTEM_VARIANT_STUB = false;

const LOCK_OWNER = 'usecase-edit';

const INITIAL_SESSION_LOCAL_STATE = {
  availableGraphKeys: null as KeyDefinitionResponseDto[] | null,
  excludedLinks: [] as Connection[],
  kvSelectionsById: {} as Record<string, KvSelection[]>,
  pairLinksById: {} as Record<string, SubgraphPairResponseDto>,
  stagedProcessedChangeIds: [] as string[],
  subgraphProvenanceById: {} as Record<string, SubgraphProvenance>,
};

/** Preserves staged vector identity while accepting refreshed selected/EC values. */
function reconcileSgKvConfigInfo(
  currentVectorsBySubgraphId: Record<string, KvSelection[]>,
  incomingVectorsBySubgraphId: Record<string, KvSelection[]>,
): Record<string, KvSelection[]> {
  // Preserve staged selections and `local:` vectors; refresh derived metadata.
  let changed =
    Object.keys(currentVectorsBySubgraphId).length !==
    Object.keys(incomingVectorsBySubgraphId).length;
  const reconciledVectorsBySubgraphId: Record<string, KvSelection[]> = {};

  for (const [subgraphSystemId, incomingVectors] of Object.entries(
    incomingVectorsBySubgraphId,
  )) {
    const currentVectors = currentVectorsBySubgraphId[subgraphSystemId];
    if (!currentVectors) {
      reconciledVectorsBySubgraphId[subgraphSystemId] = incomingVectors.map(
        (vector) => ({...vector, isSessionAdded: false}),
      );
      changed = true;
      continue;
    }

    const incomingBySystemId = Object.fromEntries(
      incomingVectors.map((vector) => [vector.systemId, vector]),
    );
    let subgraphChanged = false;
    const reconciledVectors = currentVectors.map((vector) => {
      const incoming = incomingBySystemId[vector.systemId];
      // Missing refresh data must not erase a local vector staged by this user.
      if (
        !incoming ||
        (incoming.isEc === vector.isEc && incoming.selected === vector.selected)
      ) {
        return vector;
      }

      subgraphChanged = true;
      return {...vector, isEc: incoming.isEc, selected: incoming.selected};
    });

    reconciledVectorsBySubgraphId[subgraphSystemId] = subgraphChanged
      ? reconciledVectors
      : currentVectors;
    changed ||= subgraphChanged;
  }

  return changed ? reconciledVectorsBySubgraphId : currentVectorsBySubgraphId;
}

/**
 * Creates the edit-session slice for composing into the Graph Designer tab
 * store. Holds session bookkeeping (mode, exclusive lock, the single serial
 * mutation flag) plus provenance/KV/pairLinks maps derived from graph data
 * — it owns no graph data itself, but reads it via `get()` to seed
 * provenance on entry.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @param projectId - Project identifier this session's exclusive lock is scoped to.
 */
export function createEditSessionSlice<
  S extends EditSessionSlice & {
    graphData: UsecaseGraphData | null;
    markDirty: () => void;
  },
>(set: SetState<S>, get: () => S, projectId: string): EditSessionSlice {
  const setSlice: SetState<EditSessionSlice> = set;
  const logSession = (message: string, action: string): void => {
    logger.debug(`editSessionSlice: ${message}`, {
      action,
      component: 'editSessionSlice',
      projectId,
    });
  };

  return {
    addSgKvVector: (
      subgraphSystemId: string,
      keyValuePairs: SubgraphKvPair[],
    ): boolean => {
      const vectors = get().kvSelectionsById[subgraphSystemId];
      if (!vectors || keyValuePairs.length === 0) {
        return false;
      }

      const signature = getKvVectorSignature(keyValuePairs);
      if (
        vectors.some((vector) =>
          areKvVectorsEqual(vector.keyValuePairs, keyValuePairs),
        )
      ) {
        return false;
      }

      const vector: KvSelection = {
        isEc: false,
        isSessionAdded: true,
        keyValuePairs,
        selected: true,
        systemId: `local:${signature}`,
      };
      setSlice((state) => ({
        kvSelectionsById: {
          ...state.kvSelectionsById,
          [subgraphSystemId]: [...vectors, vector],
        },
      }));
      get().markDirty();
      return true;
    },

    beginMutation: () => {
      logSession('beginMutation', 'beginMutation');
      setSlice({isMutating: true});
    },

    clearStageProcessed: (): void => {
      setSlice({stagedProcessedChangeIds: []});
    },

    deleteSgKvVector: (
      subgraphSystemId: string,
      vectorSystemId: string,
    ): void => {
      const vectors = get().kvSelectionsById[subgraphSystemId];
      const vector = vectors?.find((item) => item.systemId === vectorSystemId);
      if (!vector?.isSessionAdded) {
        return;
      }

      setSlice((state) => ({
        kvSelectionsById: {
          ...state.kvSelectionsById,
          [subgraphSystemId]: state.kvSelectionsById[subgraphSystemId].filter(
            (item) => item.systemId !== vectorSystemId,
          ),
        },
      }));
      get().markDirty();
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

      // Record current graph membership before mutations can add palette items.
      const subgraphs = get().graphData?.subgraphs ?? {};
      const subgraphProvenanceById: Record<string, SubgraphProvenance> = {};
      for (const subgraphId of Object.keys(subgraphs)) {
        subgraphProvenanceById[subgraphId] = 'pre-loaded';
      }

      // Normalize the backend session before requesting the Designer session.
      const endResult = await endSession(projectId);
      if (hasBlockingIssues(endResult) || !endResult.data) {
        const projectResult = await getProjectById(projectId);
        const alreadyEnded =
          projectResult !== undefined &&
          !hasBlockingIssues(projectResult) &&
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
      if (hasBlockingIssues(startResult) || !startResult.data) {
        logSession(
          'enterEditMode rejected — startSession failed',
          'enterEditMode',
        );
        projectStore.getState().releaseExclusiveMode(LOCK_OWNER);
        return false;
      }

      // Missing definitions disable Add controls but must not block Edit mode.
      let availableGraphKeys: KeyDefinitionResponseDto[] | null = null;
      try {
        const definitionsResult = await getAllKeyDefinitions(projectId);
        if (!hasBlockingIssues(definitionsResult) && definitionsResult.data) {
          availableGraphKeys = definitionsResult.data.filter(
            (definition) => definition.isGraphKey === true,
          );
        }
      } catch (error) {
        logger.error('editSessionSlice: graph key definition load failed', {
          action: 'enterEditMode',
          component: 'editSessionSlice',
          error: error instanceof Error ? error.message : 'Unknown error',
          projectId,
        });
      }

      const kvSelectionsById = Object.fromEntries(
        Object.entries(get().graphData?.subgraphs ?? {}).map(
          ([subgraphId, subgraph]) => [subgraphId, subgraph.kvVectors ?? []],
        ),
      );
      // Seed before exposing Edit mode so the panel never sees View-state data.
      get().updateSgKvConfigInfo(kvSelectionsById);

      setSlice({
        availableGraphKeys,
        mode: 'edit',
        subgraphProvenanceById,
        usesSubsystemVariant: USES_SUBSYSTEM_VARIANT_STUB,
      });
      projectStore.getState().setEditModeState('edit');

      logSession('enterEditMode succeeded', 'enterEditMode');
      return true;
    },

    exitEditMode: async () => {
      // No endSession call here: Apply/Discard already end the session as
      // the last step of their own commit/discard sequence before calling
      // this — see docs/design/edit-mode-toggle/edit-mode-toggle-design.md §3.
      const startResult = await startSession(projectId, SessionMode.Tuning);
      if (hasBlockingIssues(startResult) || !startResult.data) {
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

    pruneSessionLocalMapsForSubgraph: (subgraphId: string): void => {
      setSlice((state) => {
        const {[subgraphId]: _removedProvenance, ...subgraphProvenanceById} =
          state.subgraphProvenanceById;
        const {[subgraphId]: _removedKv, ...kvSelectionsById} =
          state.kvSelectionsById;
        const pairLinksById: typeof state.pairLinksById = {};
        for (const [pairKey, pair] of Object.entries(state.pairLinksById)) {
          if (
            pair.sourceSubgraphSystemId === subgraphId ||
            pair.destinationSubgraphSystemId === subgraphId
          ) {
            continue;
          }
          pairLinksById[pairKey] = pair;
        }
        return {kvSelectionsById, pairLinksById, subgraphProvenanceById};
      });
    },

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

    setSgKvVectorSelected: (
      subgraphSystemId: string,
      vectorSystemId: string,
      selected: boolean,
    ): void => {
      const vectors = get().kvSelectionsById[subgraphSystemId];
      const vector = vectors?.find((item) => item.systemId === vectorSystemId);
      if (!vector || vector.selected === selected) {
        return;
      }

      setSlice((state) => ({
        kvSelectionsById: {
          ...state.kvSelectionsById,
          [subgraphSystemId]: state.kvSelectionsById[subgraphSystemId].map(
            (item) =>
              item.systemId === vectorSystemId ? {...item, selected} : item,
          ),
        },
      }));
      get().markDirty();
    },

    setSubgraphProvenance: (
      subgraphId: string,
      provenance: SubgraphProvenance,
    ): void => {
      setSlice((state) => ({
        subgraphProvenanceById: {
          ...state.subgraphProvenanceById,
          [subgraphId]: provenance,
        },
      }));
    },

    updateSgKvConfigInfo: (
      vectorsBySubgraphId: Record<string, KvSelection[]>,
    ): void => {
      const currentKvSelectionsById = get().kvSelectionsById;
      const kvSelectionsById = reconcileSgKvConfigInfo(
        currentKvSelectionsById,
        vectorsBySubgraphId,
      );
      if (kvSelectionsById === currentKvSelectionsById) {
        // Retain Zustand references when metadata was already current.
        return;
      }

      setSlice({kvSelectionsById});
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
