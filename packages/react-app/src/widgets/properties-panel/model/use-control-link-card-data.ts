/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import {
  fetchControlLinkProperties,
  patchControlLinkProperties,
} from '~entities/control-links';

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
  const patchProperties = useCallback(
    (request: Parameters<typeof patchControlLinkProperties>[2]) =>
      patchControlLinkProperties(projectId, controlLinkId, request),
    [controlLinkId, projectId],
  );

  return useSchemaCardData({
    entityId: controlLinkId,
    fetchProperties,
    patchProperties,
  });
}
