/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {fetchSpfModuleProperties} from '~entities/spf-modules';

import {
  useSchemaCardData,
  type UseSchemaCardDataResult,
} from './use-schema-card-data';

export function useModuleCardData({
  moduleId,
  projectId,
}: {
  moduleId: string;
  projectId: string;
}): UseSchemaCardDataResult {
  const fetchProperties = useCallback(
    (entityId: string) => fetchSpfModuleProperties(projectId, entityId),
    [projectId],
  );

  return useSchemaCardData({
    entityId: moduleId,
    entityType: 'module',
    fetchProperties,
    projectId,
  });
}
