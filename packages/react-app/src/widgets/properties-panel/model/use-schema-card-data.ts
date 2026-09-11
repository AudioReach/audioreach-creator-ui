/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useRef, useState} from 'react';

import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';
import type {ApiResult} from '~shared/api';
import type {
  PatchPropertiesRequestDto,
  PropertyDto,
} from '~shared/lib/property.dto';

import {
  dirtyItemsToPatchPropertiesRequest,
  propertyDtosToTreeViewData,
} from '../lib/property-tree-adapter';

export interface UseSchemaCardDataOptions {
  entityId: string;
  fetchProperties: (entityId: string) => Promise<ApiResult<PropertyDto[]>>;
  onCommitSuccess?: (
    dirtyItems: TreeViewItem[],
    nextProperties: PropertyDto[],
  ) => Promise<void> | void;
  patchProperties: (
    request: PatchPropertiesRequestDto,
  ) => Promise<ApiResult<PropertyDto[]>>;
}

export interface UseSchemaCardDataResult {
  data: TreeViewData | null;
  error: string | null;
  handleCommit: (dirtyItems: TreeViewItem[]) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  load: () => Promise<void>;
  saveError: string | null;
}

export function useSchemaCardData({
  entityId,
  fetchProperties,
  onCommitSuccess,
  patchProperties,
}: UseSchemaCardDataOptions): UseSchemaCardDataResult {
  const [data, setData] = useState<TreeViewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalProperties, setOriginalProperties] = useState<PropertyDto[]>(
    [],
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const activeEntityIdRef = useRef(entityId);
  const fetchRequestIdRef = useRef(0);
  const patchRequestIdRef = useRef(0);

  activeEntityIdRef.current = entityId;

  const load = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current;
    setError(null);
    setIsLoading(true);

    try {
      const result = await fetchProperties(entityId);

      if (
        requestId !== fetchRequestIdRef.current ||
        entityId !== activeEntityIdRef.current
      ) {
        return;
      }

      if (!result.success || !result.data) {
        setData(null);
        setError(result.message ?? 'Failed to load schema properties');
        setOriginalProperties([]);
        return;
      }

      setData(propertyDtosToTreeViewData(entityId, result.data, 'get'));
      setOriginalProperties(result.data);
    } catch {
      if (
        requestId !== fetchRequestIdRef.current ||
        entityId !== activeEntityIdRef.current
      ) {
        return;
      }

      setData(null);
      setError('Failed to load schema properties');
      setOriginalProperties([]);
    } finally {
      if (
        requestId === fetchRequestIdRef.current &&
        entityId === activeEntityIdRef.current
      ) {
        setIsLoading(false);
      }
    }
  }, [entityId, fetchProperties]);

  useEffect(() => {
    setIsSaving(false);
    setSaveError(null);
    void load();

    return () => {
      fetchRequestIdRef.current += 1;
      patchRequestIdRef.current += 1;
    };
  }, [load]);

  const handleCommit = useCallback(
    async (dirtyItems: TreeViewItem[]) => {
      if (dirtyItems.length === 0) {
        return;
      }

      const requestId = ++patchRequestIdRef.current;
      const committedEntityId = entityId;
      const request = dirtyItemsToPatchPropertiesRequest(
        dirtyItems,
        originalProperties,
      );
      setIsSaving(true);
      setSaveError(null);

      try {
        const result = await patchProperties(request);

        if (
          requestId !== patchRequestIdRef.current ||
          committedEntityId !== activeEntityIdRef.current
        ) {
          return;
        }

        if (!result.success || !result.data) {
          setSaveError(result.message ?? 'Failed to save schema properties');
          return;
        }

        setData(
          propertyDtosToTreeViewData(committedEntityId, result.data, 'set'),
        );
        setOriginalProperties(result.data);
        await onCommitSuccess?.(dirtyItems, result.data);
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
          setIsSaving(false);
        }
      }
    },
    [entityId, onCommitSuccess, originalProperties, patchProperties],
  );

  return {data, error, handleCommit, isLoading, isSaving, load, saveError};
}
