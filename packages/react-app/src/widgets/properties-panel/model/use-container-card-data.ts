/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {
  fetchContainerProperties,
  patchContainerProperty,
} from '~entities/containers';
import type {TreeViewItem} from '~features/generic-tree-view';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import type {PropertyDto} from '~shared/lib/property.dto';

import {propertyDtoToUpdateRequest} from '../lib/property-tree-adapter';
import {
  dirtyItemsHaveConfigName,
  propertyDtosHaveConfigName,
} from '../lib/schema-property-fields';
import {
  useSchemaCardData,
  type UseSchemaCardDataResult,
} from './use-schema-card-data';
import {refreshCachedModulePropertiesForContainer} from './module-properties-coordinator';

export function useContainerCardData({
  containerId,
  moduleIds,
  projectId,
}: {
  containerId: string;
  moduleIds: string[];
  projectId: string;
}): UseSchemaCardDataResult {
  const fetchProperties = useCallback(
    (entityId: string) => fetchContainerProperties(projectId, entityId),
    [projectId],
  );
  const saveProperty = useCallback(
    async (property: PropertyDto) => {
      const result = await patchContainerProperty(
        projectId,
        containerId,
        property.systemId,
        propertyDtoToUpdateRequest(property),
      );
      if (hasBlockingIssues(result) || !result.data) {
        return {
          message: getIssueMessage(result, 'Failed to save schema properties'),
          success: false as const,
        };
      }

      return {
        data: {property: result.data, type: 'replaceProperty' as const},
        message: getIssueMessage(result, ''),
        success: true as const,
      };
    },
    [containerId, projectId],
  );

  return useSchemaCardData({
    entityId: containerId,
    entityType: 'container',
    fetchProperties,
    onCommitSuccess: async (
      dirtyItems: TreeViewItem[],
      nextProperties: PropertyDto[],
    ) => {
      if (
        dirtyItemsHaveConfigName(dirtyItems, 'Container Heap') ||
        propertyDtosHaveConfigName(nextProperties, 'Container Heap')
      ) {
        await refreshCachedModulePropertiesForContainer(projectId, moduleIds);
      }
    },
    projectId,
    saveProperty,
  });
}
