/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useRef} from 'react';

import {
  fetchSubgraphProperties,
  patchSubgraphProperties,
} from '~entities/subgraphs';
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

export function useSubgraphCardData({
  projectId,
  subgraphId,
}: {
  projectId: string;
  subgraphId: string;
}): UseSchemaCardDataResult {
  const loadRef = useRef<(() => Promise<void>) | null>(null);
  const fetchProperties = useCallback(
    (entityId: string) => fetchSubgraphProperties(projectId, entityId),
    [projectId],
  );
  const patchProperties = useCallback(
    (request: Parameters<typeof patchSubgraphProperties>[2]) =>
      patchSubgraphProperties(projectId, subgraphId, request),
    [projectId, subgraphId],
  );

  const schemaData = useSchemaCardData({
    entityId: subgraphId,
    fetchProperties,
    onCommitSuccess: async (
      dirtyItems: TreeViewItem[],
      nextProperties: PropertyDto[],
    ) => {
      if (
        dirtyItemsHaveConfigName(dirtyItems, 'Scenario ID') ||
        propertyDtosHaveConfigName(nextProperties, 'Scenario ID')
      ) {
        await loadRef.current?.();
      }
    },
    patchProperties,
  });

  loadRef.current = schemaData.load;

  return schemaData;
}
