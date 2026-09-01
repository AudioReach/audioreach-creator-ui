/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {deleteSpfModule} from '~entities/spf-modules';
import {showToast} from '~shared/controls/global-toaster';

import {
  EMPTY_COLLECTION,
  type InnerActionOptions,
} from '../lib/module-operations';
import {withMutationLock} from '../model/edit-session-slice';
import type {GraphDesignerStore} from '../model/graph-designer-store';

export interface ContainerOperations {
  deleteContainer: (
    get: () => GraphDesignerStore,
    containerId: string,
  ) => Promise<boolean>;
  deleteContainerInner: (
    get: () => GraphDesignerStore,
    containerId: string,
    options?: InnerActionOptions,
  ) => Promise<boolean>;
}

function moduleIdsInContainer(
  get: () => GraphDesignerStore,
  containerId: string,
): string[] {
  return Object.values(get().graphData!.moduleInstances)
    .filter((m) => m.containerId === containerId)
    .map((m) => m.moduleInstanceId);
}

export function createContainerOperations(
  projectId: string,
): ContainerOperations {
  async function deleteContainerInner(
    get: () => GraphDesignerStore,
    containerId: string,
    options?: InnerActionOptions,
  ): Promise<boolean> {
    for (const moduleId of moduleIdsInContainer(get, containerId)) {
      const result = await deleteSpfModule(projectId, moduleId);
      if (!result.success || !result.data) {
        if (!options?.suppressToast) {
          showToast(result.message ?? 'Failed to delete container', 'danger');
        }
        return false;
      }
      await get().applyComponentCollection({
        added: EMPTY_COLLECTION,
        deleted: {
          controlLinks: result.data.deleted.controlLinks ?? [],
          dataLinks: result.data.deleted.dataLinks ?? [],
          spfModules: result.data.deleted.spfModules ?? [],
          subgraphs: result.data.deleted.subgraphs ?? [],
        },
        updated: EMPTY_COLLECTION,
      });
    }
    return true;
  }

  return {
    deleteContainer: (get, containerId) =>
      withMutationLock(get, () => deleteContainerInner(get, containerId)),

    deleteContainerInner,
  };
}
