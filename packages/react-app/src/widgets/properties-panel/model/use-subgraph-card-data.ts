/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useContext, useRef} from 'react';

import {
  fetchSubgraphProperties,
  patchSubgraphProperty,
  patchSubgraphScenario,
  patchSubgraphVsid,
} from '~entities/subgraphs';
import type {TreeViewItem} from '~features/generic-tree-view';
import {GraphDesignerStoreContext} from '~features/graph-designer/model/graph-designer-store-context';
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

const SCENARIO_PROPERTY_ID = 0x08001010;
const VSID_PROPERTY_ID = 0x080010cc;

export function useSubgraphCardData({
  projectId,
  subgraphId,
}: {
  projectId: string;
  subgraphId: string;
}): UseSchemaCardDataResult {
  const graphDesignerStore = useContext(GraphDesignerStoreContext);
  const loadRef = useRef<(() => Promise<void>) | null>(null);
  const fetchProperties = useCallback(
    (entityId: string) => fetchSubgraphProperties(projectId, entityId),
    [projectId],
  );
  const saveProperty = useCallback(
    async (property: PropertyDto) => {
      const request = propertyDtoToUpdateRequest(property);

      if (property.naturalId === SCENARIO_PROPERTY_ID) {
        const result = await patchSubgraphScenario(
          projectId,
          subgraphId,
          request,
        );
        if (hasBlockingIssues(result) || !result.data) {
          return {
            message: getIssueMessage(result, 'Failed to save schema properties'),
            success: false as const,
          };
        }

        // The scenario change is already staged; don't lose it if the
        // refresh below fails.
        graphDesignerStore?.getState().markDirty();

        const nextProperties = await fetchSubgraphProperties(
          projectId,
          subgraphId,
        );
        if (hasBlockingIssues(nextProperties) || !nextProperties.data) {
          return {
            message: getIssueMessage(
              nextProperties,
              'Failed to refresh schema properties',
            ),
            success: false as const,
          };
        }

        return {
          data: {
            properties: nextProperties.data,
            type: 'replaceProperties' as const,
          },
          message: getIssueMessage(result, ''),
          success: true as const,
        };
      }

      if (property.naturalId === VSID_PROPERTY_ID) {
        const result = await patchSubgraphVsid(projectId, subgraphId, request);
        if (hasBlockingIssues(result) || !result.data) {
          return {
            message: getIssueMessage(result, 'Failed to save schema properties'),
            success: false as const,
          };
        }

        return {
          data: {
            affectedSubgraphSystemIds: result.data.affectedSubgraphSystemIds,
            property,
            type: 'propagateVsid' as const,
          },
          message: getIssueMessage(result, ''),
          success: true as const,
        };
      }

      const result = await patchSubgraphProperty(
        projectId,
        subgraphId,
        request,
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
    [graphDesignerStore, projectId, subgraphId],
  );

  const schemaData = useSchemaCardData({
    entityId: subgraphId,
    entityType: 'subgraph',
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
    onStagedChange: () => graphDesignerStore?.getState().markDirty(),
    projectId,
    saveProperty,
  });

  loadRef.current = schemaData.load;

  return schemaData;
}
