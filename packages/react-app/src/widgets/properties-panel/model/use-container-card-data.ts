/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {
  fetchContainerProperties,
  patchContainerProperties,
} from '~entities/containers';
import type {TreeViewItem} from '~features/generic-tree-view';
import type {PropertyDto} from '~shared/lib/property.dto';

import {
  dirtyItemsHaveConfigName,
  propertyDtosHaveConfigName,
} from '../lib/schema-property-fields';
import {
  useSchemaCardData,
  type UseSchemaCardDataResult,
} from './use-schema-card-data';

export function useContainerCardData({
  containerId,
  onContainerHeapUpdated,
  projectId,
}: {
  containerId: string;
  onContainerHeapUpdated?: (containerId: string) => Promise<void> | void;
  projectId: string;
}): UseSchemaCardDataResult {
  const fetchProperties = useCallback(
    (entityId: string) => fetchContainerProperties(projectId, entityId),
    [projectId],
  );
  const patchProperties = useCallback(
    (request: Parameters<typeof patchContainerProperties>[2]) =>
      patchContainerProperties(projectId, containerId, request),
    [containerId, projectId],
  );

  return useSchemaCardData({
    entityId: containerId,
    fetchProperties,
    onCommitSuccess: async (
      dirtyItems: TreeViewItem[],
      nextProperties: PropertyDto[],
    ) => {
      if (
        dirtyItemsHaveConfigName(dirtyItems, 'Container Heap') ||
        propertyDtosHaveConfigName(nextProperties, 'Container Heap')
      ) {
        await onContainerHeapUpdated?.(containerId);
      }
    },
    patchProperties,
  });
}
