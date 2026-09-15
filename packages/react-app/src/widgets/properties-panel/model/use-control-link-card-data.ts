/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {
  fetchControlLinkProperties,
  patchControlLinkProperties,
} from '~entities/control-links';
import type {PropertyDto} from '~shared/lib/property.dto';

import {
  useSchemaCardData,
  type UseSchemaCardDataResult,
} from './use-schema-card-data';

export function useControlLinkCardData({
  controlLinkId,
  projectId,
}: {
  controlLinkId: string;
  projectId: string;
}): UseSchemaCardDataResult {
  const fetchProperties = useCallback(
    (entityId: string) => fetchControlLinkProperties(projectId, entityId),
    [projectId],
  );
  const saveProperty = useCallback(
    async (property: PropertyDto) => {
      const result = await patchControlLinkProperties(
        projectId,
        controlLinkId,
        {properties: [property]},
      );
      if (!result.success || !result.data) {
        return {
          message: result.message ?? 'Failed to save schema properties',
          success: false as const,
        };
      }

      const nextProperty =
        result.data.find(
          (candidate) => candidate.systemId === property.systemId,
        ) ?? property;
      return {
        data: {property: nextProperty, type: 'replaceProperty' as const},
        message: result.message,
        success: true as const,
      };
    },
    [controlLinkId, projectId],
  );

  return useSchemaCardData({
    entityId: controlLinkId,
    entityType: 'controlLink',
    fetchProperties,
    projectId,
    saveProperty,
  });
}
