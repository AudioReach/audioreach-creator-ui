/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {type AnyNode, NODE_KIND} from '~entities/graph';
import {
  createSpfModule,
  deleteSpfModule,
  patchSpfModule,
} from '~entities/spf-modules';
import type {CreateSpfModuleRequestDto} from '~entities/spf-modules/model/spf-module-crud.dto';
import type {ComponentCollectionDto} from '~entities/usecases/model/usecase-component.dto';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';

import {withMutationLock} from '../model/edit-session-slice';
import type {DeletedIdsCollection} from '../model/graph-data-slice';
import type {GraphDesignerStore} from '../model/graph-designer-store';

export interface InnerActionOptions {
  suppressToast?: boolean;
}

const EMPTY_ID_ARRAYS = {controlLinks: [], dataLinks: [], spfModules: []};

export const EMPTY_COLLECTION: ComponentCollectionDto = EMPTY_ID_ARRAYS;

export const EMPTY_DELETED_COLLECTION: DeletedIdsCollection = EMPTY_ID_ARRAYS;

export type ModuleDropResolution =
  | {containerId: string; kind: 'container'}
  | {kind: 'subgraph-no-container'; subgraphId: string}
  | {kind: 'empty-canvas'}
  | {kind: 'rejected'};

export function resolveModuleDropTarget(
  target: AnyNode | 'empty-canvas',
): ModuleDropResolution {
  if (target === 'empty-canvas') {
    return {kind: 'empty-canvas'};
  }
  switch (target.nodeKind) {
    case NODE_KIND.CONTAINER:
      return {containerId: String(target.containerId), kind: 'container'};
    case NODE_KIND.SUBGRAPH:
      return {
        kind: 'subgraph-no-container',
        subgraphId: String(target.subgraphId),
      };
    case NODE_KIND.MODULE:
      if (!target.parentId) {
        throw new Error(
          `resolveModuleDropTarget: module node ${target.id} has no parentId — invariant violation, every ModuleNode must have its container as parentId`,
        );
      }
      return {containerId: target.parentId, kind: 'container'};
    case NODE_KIND.SUBGRAPH_PROXY:
    case NODE_KIND.SUBSYSTEM:
      return {kind: 'rejected'};
  }
}

export interface ModuleDropPayload {
  kind: 'module';
  moduleId: string;
  processorSystemId: string;
}

export function parseModuleDropPayload(
  dropData: string,
): ModuleDropPayload | null {
  try {
    const parsed: unknown = JSON.parse(dropData);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as {kind?: unknown}).kind === 'module' &&
      typeof (parsed as {moduleId?: unknown}).moduleId === 'string' &&
      typeof (parsed as {processorSystemId?: unknown}).processorSystemId ===
        'string'
    ) {
      return parsed as ModuleDropPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export interface ModuleOperations {
  addModuleToContainer: (
    get: () => GraphDesignerStore,
    containerId: string,
    moduleId: string,
    position: {x: number; y: number},
    processorSystemId: string,
  ) => Promise<boolean>;
  addModuleToEmptyCanvas: (
    get: () => GraphDesignerStore,
    moduleId: string,
    position: {x: number; y: number},
    processorSystemId: string,
  ) => Promise<boolean>;
  addModuleToSubgraphNoContainer: (
    get: () => GraphDesignerStore,
    subgraphId: string,
    moduleId: string,
    position: {x: number; y: number},
    processorSystemId: string,
  ) => Promise<boolean>;
  deleteModuleInstance: (
    get: () => GraphDesignerStore,
    moduleInstanceId: string,
  ) => Promise<boolean>;
  deleteModuleInstanceInner: (
    get: () => GraphDesignerStore,
    moduleInstanceId: string,
    options?: InnerActionOptions,
  ) => Promise<boolean>;
  renameModuleInstance: (
    get: () => GraphDesignerStore,
    moduleInstanceId: string,
    newAlias: string,
  ) => Promise<void>;
}

export function createModuleOperations(
  set: StoreApi<GraphDesignerStore>['setState'],
  projectId: string,
): ModuleOperations {
  async function addModuleInner(
    get: () => GraphDesignerStore,
    request: CreateSpfModuleRequestDto,
    position: {x: number; y: number},
  ): Promise<string | null> {
    const result = await createSpfModule(projectId, request);
    if (!result.success || !result.data) {
      showToast(result.message ?? 'Failed to add module', 'danger');
      return null;
    }

    await get().applyComponentCollection({
      added: {...EMPTY_COLLECTION, spfModules: [result.data]},
      deleted: EMPTY_DELETED_COLLECTION,
      updated: EMPTY_COLLECTION,
    });

    const newModuleId = result.data.systemId;
    // applyComponentCollection above has resolved and already upserted this
    // module (with a default position), so the entry is guaranteed to exist
    // here — this write only overrides its position field.
    set((s) => ({
      graphData: s.graphData && {
        ...s.graphData,
        moduleInstances: {
          ...s.graphData.moduleInstances,
          [newModuleId]: {
            ...s.graphData.moduleInstances[newModuleId],
            position,
          },
        },
      },
    }));

    return newModuleId;
  }

  async function deleteModuleInstanceInner(
    get: () => GraphDesignerStore,
    moduleInstanceId: string,
    options?: InnerActionOptions,
  ): Promise<boolean> {
    const result = await deleteSpfModule(projectId, moduleInstanceId);
    if (!result.success || !result.data) {
      if (!options?.suppressToast) {
        showToast(result.message ?? 'Failed to delete module', 'danger');
      }
      return false;
    }

    const {deleted} = result.data;
    await get().applyComponentCollection({
      added: EMPTY_COLLECTION,
      deleted: {
        controlLinks: deleted.controlLinks ?? [],
        dataLinks: deleted.dataLinks ?? [],
        spfModules: deleted.spfModules ?? [],
        subgraphs: deleted.subgraphs ?? [],
      },
      updated: EMPTY_COLLECTION,
    });

    return true;
  }

  return {
    addModuleToContainer: (
      get,
      containerId,
      moduleId,
      position,
      processorSystemId,
    ) =>
      withMutationLock(get, async () => {
        const newModuleId = await addModuleInner(
          get,
          {
            containerSystemId: containerId,
            moduleDefinitionSystemId: moduleId,
            processorSystemId,
          },
          position,
        );
        return newModuleId !== null;
      }),

    addModuleToEmptyCanvas: (get, moduleId, position, processorSystemId) =>
      withMutationLock(get, async () => {
        const newModuleId = await addModuleInner(
          get,
          {
            moduleDefinitionSystemId: moduleId,
            processorSystemId,
          },
          position,
        );
        if (newModuleId === null) {
          return false;
        }
        const subgraphId =
          get().graphData!.moduleInstances[newModuleId].subgraphId;
        get().setSubgraphProvenance(subgraphId, 'newly-created');
        return true;
      }),

    addModuleToSubgraphNoContainer: (
      get,
      subgraphId,
      moduleId,
      position,
      processorSystemId,
    ) =>
      withMutationLock(get, async () => {
        const newModuleId = await addModuleInner(
          get,
          {
            moduleDefinitionSystemId: moduleId,
            processorSystemId,
            subgraphSystemId: subgraphId,
          },
          position,
        );
        return newModuleId !== null;
      }),

    deleteModuleInstance: (get, moduleInstanceId) =>
      withMutationLock(get, () =>
        deleteModuleInstanceInner(get, moduleInstanceId),
      ),

    deleteModuleInstanceInner,

    renameModuleInstance: async (get, moduleInstanceId, newAlias) => {
      await withMutationLock(get, async () => {
        const result = await patchSpfModule(projectId, moduleInstanceId, {
          alias: newAlias,
        });
        if (!result.success || !result.data) {
          showToast(result.message ?? 'Failed to rename module', 'danger');
          return;
        }
        if (result.data.systemId !== moduleInstanceId) {
          logger.warn(
            `module-operations: renameModuleInstance — response systemId ${result.data.systemId} does not match requested ${moduleInstanceId}, skipping state write`,
            {action: 'renameModuleInstance', component: 'moduleOperations'},
          );
          return;
        }
        if (!get().graphData?.moduleInstances[moduleInstanceId]) {
          logger.warn(
            `module-operations: renameModuleInstance — no local module instance for ${moduleInstanceId}, skipping state write`,
            {action: 'renameModuleInstance', component: 'moduleOperations'},
          );
          return;
        }
        const {alias} = result.data;
        set((s) => ({
          graphData: s.graphData && {
            ...s.graphData,
            moduleInstances: {
              ...s.graphData.moduleInstances,
              [moduleInstanceId]: {
                ...s.graphData.moduleInstances[moduleInstanceId],
                displayName: alias,
              },
            },
          },
        }));
        get().markDirty();
      });
    },
  };
}
