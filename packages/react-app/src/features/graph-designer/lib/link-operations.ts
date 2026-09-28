/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  createControlLink,
  createControlLinkWithSubsystems,
  createDataLink,
  createDataLinkWithSubsystems,
  deleteControlLink,
  deleteDataLink,
  toControlLinkType,
} from '~entities/usecases';
import type {
  ComponentCollectionDto,
  LinkType,
} from '~entities/usecases/model/usecase-component.dto';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {showToast} from '~shared/controls/global-toaster';

import {withMutationLock} from '../model/edit-session-slice';
import type {DeletedIdsCollection} from '../model/graph-data-slice';
import type {GraphDesignerStore} from '../model/graph-designer-store';

import {partitionIssues} from './issue-gate';
import type {InnerActionOptions} from './module-operations';

// This file inlines its own copy rather than importing across operations
// files — every operations file keeps its own.
const EMPTY_COLLECTION: ComponentCollectionDto = {
  controlLinks: [],
  dataLinks: [],
  spfModules: [],
};

const EMPTY_DELETED_COLLECTION: DeletedIdsCollection = {
  controlLinks: [],
  dataLinks: [],
  spfModules: [],
};

const DELETE_LINK_BY_TYPE = {
  control: {deleteFn: deleteControlLink, key: 'controlLinks' as const},
  data: {deleteFn: deleteDataLink, key: 'dataLinks' as const},
};

type EdgeMode = 'EC' | 'dangling' | 'normal';

function toDataLinkType(edgeMode: EdgeMode): LinkType {
  return edgeMode === 'dangling'
    ? 'INTER_USECASE'
    : edgeMode === 'normal'
      ? 'NORMAL'
      : 'EC';
}

export interface LinkOperations {
  connectPorts: (
    get: () => GraphDesignerStore,
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string,
    edgeKind: 'control' | 'data',
    edgeMode: EdgeMode,
  ) => Promise<boolean>;
  deleteLink: (
    get: () => GraphDesignerStore,
    connectionId: string,
    linkType: 'control' | 'data',
  ) => Promise<boolean>;
  deleteLinkInner: (
    get: () => GraphDesignerStore,
    connectionId: string,
    linkType: 'control' | 'data',
    options?: InnerActionOptions,
  ) => Promise<boolean>;
}

export function createLinkOperations(projectId: string) {
  return {connectPorts, deleteLink, deleteLinkInner};

  function isSubsystemNode(
    get: () => GraphDesignerStore,
    nodeId: string,
  ): boolean {
    return nodeId in (get().graphData?.subsystems ?? {});
  }

  async function connectPortsInner(
    get: () => GraphDesignerStore,
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string,
    edgeKind: 'control' | 'data',
    edgeMode: EdgeMode,
  ): Promise<boolean> {
    const useSubsystemVariant =
      isSubsystemNode(get, sourceNodeId) || isSubsystemNode(get, targetNodeId);

    const result =
      edgeKind === 'data'
        ? useSubsystemVariant
          ? await createDataLinkWithSubsystems(projectId, {
              destinationNodeSystemId: targetNodeId,
              destinationPortSystemId: targetPortId,
              linkType: toDataLinkType(edgeMode),
              sourceNodeSystemId: sourceNodeId,
              sourcePortSystemId: sourcePortId,
            })
          : await createDataLink(projectId, {
              destinationModuleSystemId: targetNodeId,
              destinationPortSystemId: targetPortId,
              linkType: toDataLinkType(edgeMode),
              sourceModuleSystemId: sourceNodeId,
              sourcePortSystemId: sourcePortId,
            })
        : await (
            useSubsystemVariant
              ? createControlLinkWithSubsystems
              : createControlLink
          )(projectId, {
            endComponentSystemId: targetNodeId,
            endPortSystemId: targetPortId,
            linkType: toControlLinkType(toDataLinkType(edgeMode)),
            startComponentSystemId: sourceNodeId,
            startPortSystemId: sourcePortId,
          });

    if (hasBlockingIssues(result) || !result.data) {
      showToast(
        getIssueMessage(result, 'Failed to create connection'),
        'danger',
      );
      return false;
    }

    await get().applyComponentCollection({
      added: result.data,
      deleted: EMPTY_DELETED_COLLECTION,
      updated: EMPTY_COLLECTION,
    });

    // Show any warning the backend returned about this connection.
    if (edgeKind === 'control' && result.issues?.length) {
      const {notices} = partitionIssues(result.issues);
      notices.forEach((issue) => showToast(issue.message, 'warning'));
    }

    return true;
  }

  async function connectPorts(
    get: () => GraphDesignerStore,
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string,
    edgeKind: 'control' | 'data',
    edgeMode: EdgeMode,
  ): Promise<boolean> {
    return withMutationLock(get, () =>
      connectPortsInner(
        get,
        sourceNodeId,
        sourcePortId,
        targetNodeId,
        targetPortId,
        edgeKind,
        edgeMode,
      ),
    );
  }

  async function deleteLinkInner(
    get: () => GraphDesignerStore,
    connectionId: string,
    linkType: 'control' | 'data',
    options?: InnerActionOptions,
  ): Promise<boolean> {
    const {deleteFn, key} = DELETE_LINK_BY_TYPE[linkType];
    const result = await deleteFn(projectId, connectionId);

    if (hasBlockingIssues(result) || !result.data) {
      if (!options?.suppressToast) {
        showToast(
          getIssueMessage(result, 'Failed to delete connection'),
          'danger',
        );
      }
      return false;
    }

    await get().applyComponentCollection({
      added: EMPTY_COLLECTION,
      deleted: {...EMPTY_DELETED_COLLECTION, [key]: [connectionId]},
      updated: EMPTY_COLLECTION,
    });
    return true;
  }

  async function deleteLink(
    get: () => GraphDesignerStore,
    connectionId: string,
    linkType: 'control' | 'data',
  ): Promise<boolean> {
    return withMutationLock(get, () =>
      deleteLinkInner(get, connectionId, linkType),
    );
  }
}
