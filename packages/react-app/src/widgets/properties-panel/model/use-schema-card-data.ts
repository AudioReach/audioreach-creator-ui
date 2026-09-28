/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';
import {
  getIssueMessage,
  hasBlockingIssues,
  hasIssues,
  type ApiResult,
} from '~shared/api';
import type {PropertyDto} from '~shared/lib/property.dto';

import {
  dirtyItemsToProperties,
  propertyDtosToTreeViewData,
} from '../lib/property-tree-adapter';
import {
  EMPTY_PROPERTIES_ENTRY,
  propertiesEntryKey,
  type PropertiesEntityType,
  usePropertiesPanelStore,
} from './use-properties-panel-store';

export type SchemaPropertyCommitResult =
  | {property: PropertyDto; type: 'replaceProperty'}
  | {properties: PropertyDto[]; type: 'replaceProperties'}
  | {
      affectedSubgraphSystemIds: string[];
      property: PropertyDto;
      type: 'propagateVsid';
    };

export interface UseSchemaCardDataOptions {
  entityId: string;
  entityType: PropertiesEntityType;
  fetchProperties: (entityId: string) => Promise<ApiResult<PropertyDto[]>>;
  onCommitSuccess?: (
    dirtyItems: TreeViewItem[],
    nextProperties: PropertyDto[],
  ) => Promise<void> | void;
  projectId: string;
  saveProperty?: (
    property: PropertyDto,
  ) => Promise<ApiResult<SchemaPropertyCommitResult>>;
}

export interface UseSchemaCardDataResult {
  data: TreeViewData | null;
  error: string | null;
  handleCommit: (dirtyItems: TreeViewItem[]) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  load: () => Promise<void>;
  loadWarning: string | null;
  properties: PropertyDto[];
  saveError: string | null;
}

export function useSchemaCardData({
  entityId,
  entityType,
  fetchProperties,
  onCommitSuccess,
  projectId,
  saveProperty,
}: UseSchemaCardDataOptions): UseSchemaCardDataResult {
  const entryKey = propertiesEntryKey(projectId, entityType, entityId);
  const entry = usePropertiesPanelStore(
    useCallback(
      (state) => state.entries[entryKey] ?? EMPTY_PROPERTIES_ENTRY,
      [entryKey],
    ),
  );
  const applySubgraphVsidUpdate = usePropertiesPanelStore(
    (state) => state.applySubgraphVsidUpdate,
  );
  const evictEntry = usePropertiesPanelStore((state) => state.evictEntry);
  const replaceProperties = usePropertiesPanelStore(
    (state) => state.replaceProperties,
  );
  const replaceProperty = usePropertiesPanelStore(
    (state) => state.replaceProperty,
  );
  const setEntryError = usePropertiesPanelStore((state) => state.setEntryError);
  const setEntryLoading = usePropertiesPanelStore(
    (state) => state.setEntryLoading,
  );
  const setPropertySaving = usePropertiesPanelStore(
    (state) => state.setPropertySaving,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const activeEntityIdRef = useRef(entityId);
  const fetchRequestIdRef = useRef(0);
  const patchRequestIdRef = useRef(0);

  activeEntityIdRef.current = entityId;
  const data = useMemo<TreeViewData | null>(
    () => propertyDtosToTreeViewData(entityId, entry.properties, 'get'),
    [entityId, entry.properties],
  );
  const isSaving = entry.savingPropertySystemIds.length > 0;

  const load = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current;
    setLoadWarning(null);
    setEntryError(projectId, entityType, entityId, null);
    setEntryLoading(projectId, entityType, entityId, true);

    try {
      const result = await fetchProperties(entityId);

      if (
        requestId !== fetchRequestIdRef.current ||
        entityId !== activeEntityIdRef.current
      ) {
        return;
      }

      if (!result.data) {
        replaceProperties(projectId, entityType, entityId, []);
        setEntryError(
          projectId,
          entityType,
          entityId,
          getIssueMessage(result, 'Failed to load schema properties'),
        );
        return;
      }

      replaceProperties(projectId, entityType, entityId, result.data);
      if (hasIssues(result)) {
        setLoadWarning(getIssueMessage(result, 'Some properties were skipped'));
      }
    } catch {
      if (
        requestId !== fetchRequestIdRef.current ||
        entityId !== activeEntityIdRef.current
      ) {
        return;
      }

      replaceProperties(projectId, entityType, entityId, []);
      setLoadWarning(null);
      setEntryError(
        projectId,
        entityType,
        entityId,
        'Failed to load schema properties',
      );
    } finally {
      if (
        requestId === fetchRequestIdRef.current &&
        entityId === activeEntityIdRef.current
      ) {
        setEntryLoading(projectId, entityType, entityId, false);
      }
    }
  }, [
    entityId,
    entityType,
    fetchProperties,
    projectId,
    replaceProperties,
    setEntryError,
    setEntryLoading,
  ]);

  useEffect(() => {
    setSaveError(null);
    void load();

    return () => {
      fetchRequestIdRef.current += 1;
      patchRequestIdRef.current += 1;
      evictEntry(projectId, entityType, entityId);
    };
  }, [entityId, entityType, evictEntry, load, projectId]);

  const handleCommit = useCallback(
    async (dirtyItems: TreeViewItem[]) => {
      if (dirtyItems.length === 0) {
        return;
      }
      if (!saveProperty) {
        setSaveError('Schema property editing is unavailable');
        return;
      }

      const requestId = ++patchRequestIdRef.current;
      const committedEntityId = entityId;
      const dirtyProperties = dirtyItemsToProperties(
        dirtyItems,
        entry.properties,
      );
      setSaveError(null);
      const committedProperties = [...entry.properties];

      try {
        for (const property of dirtyProperties) {
          setPropertySaving(
            projectId,
            entityType,
            committedEntityId,
            property.systemId,
            true,
          );
          const result = await saveProperty(property);

          if (
            requestId !== patchRequestIdRef.current ||
            committedEntityId !== activeEntityIdRef.current
          ) {
            return;
          }

          if (hasBlockingIssues(result) || !result.data) {
            setSaveError(
              getIssueMessage(result, 'Failed to save schema properties'),
            );
            return;
          }

          const commitResult = result.data;

          switch (commitResult.type) {
            case 'propagateVsid':
              replaceProperty(
                projectId,
                entityType,
                entityId,
                commitResult.property,
              );
              applySubgraphVsidUpdate(
                projectId,
                commitResult.affectedSubgraphSystemIds,
                commitResult.property.elements ?? [],
              );
              break;
            case 'replaceProperties':
              replaceProperties(
                projectId,
                entityType,
                entityId,
                commitResult.properties,
              );
              committedProperties.splice(
                0,
                committedProperties.length,
                ...commitResult.properties,
              );
              break;
            case 'replaceProperty':
              replaceProperty(
                projectId,
                entityType,
                entityId,
                commitResult.property,
              );
              {
                const index = committedProperties.findIndex(
                  (candidate) =>
                    candidate.systemId === commitResult.property.systemId ||
                    candidate.naturalId === commitResult.property.naturalId,
                );
                if (index === -1) {
                  committedProperties.push(commitResult.property);
                } else {
                  committedProperties[index] = commitResult.property;
                }
              }
              break;
          }
        }
        await onCommitSuccess?.(dirtyItems, committedProperties);
      } catch {
        if (
          requestId !== patchRequestIdRef.current ||
          committedEntityId !== activeEntityIdRef.current
        ) {
          return;
        }

        setSaveError('Failed to save schema properties');
      } finally {
        if (
          requestId === patchRequestIdRef.current &&
          committedEntityId === activeEntityIdRef.current
        ) {
          dirtyProperties.forEach((property) =>
            setPropertySaving(
              projectId,
              entityType,
              committedEntityId,
              property.systemId,
              false,
            ),
          );
        }
      }
    },
    [
      applySubgraphVsidUpdate,
      entityId,
      entityType,
      entry.properties,
      onCommitSuccess,
      projectId,
      replaceProperties,
      replaceProperty,
      saveProperty,
      setPropertySaving,
    ],
  );

  return {
    data,
    error: entry.error,
    handleCommit,
    isLoading: entry.isLoading,
    isSaving,
    load,
    loadWarning,
    properties: entry.properties,
    saveError,
  };
}
