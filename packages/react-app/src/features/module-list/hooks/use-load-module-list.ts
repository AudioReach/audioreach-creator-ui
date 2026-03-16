/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */
import {useEffect, useState} from 'react';

import {logger} from '~shared/lib/logger';

import {fetchModuleList} from '../api/fetch-module-list';
import {useItemListStore} from '../ui/ModuleList/module-list-store';
import type {TreeNode} from '../ui/ModuleList/module-list-types';

/**
 * Hook to load module list data from the backend API
 * @param projectId - The project file path to load modules for
 */
export function useLoadModuleList(projectId?: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if we have a valid project ID
    if (!projectId || projectId === 'project_undefined') {
      logger.info('[useLoadModuleList] No valid project ID, skipping fetch');
      return;
    }

    // Get the loaded project ID from store
    const {loadedProjectId} = useItemListStore.getState();

    // Skip if we've already loaded data for this project
    if (loadedProjectId === projectId) {
      logger.info(
        '[useLoadModuleList] Data already loaded for this project, skipping fetch',
      );
      return;
    }

    const loadModuleList = async () => {
      setIsLoading(true);
      setError(null);

      try {
        logger.info(
          `[useLoadModuleList] Fetching module list for project: ${projectId}`,
        );
        const result = await fetchModuleList(projectId);

        if (result.success && result.data) {
          logger.info(
            `[useLoadModuleList] Successfully fetched ${result.data.length} module categories`,
          );

          // Get store actions
          const {addItem, setItems, setLoadedProjectId} =
            useItemListStore.getState();

          // Clear existing items first
          setItems([]);

          // Add each top-level item (Subsystems, Modules, Subgraph)
          result.data.forEach((item: TreeNode) => {
            addItem(item);
          });

          // Mark this project as loaded in the store
          setLoadedProjectId(projectId);

          logger.info('[useLoadModuleList] Module list loaded successfully');
        } else {
          const errorMsg = result.message || 'Failed to load module list';
          logger.error(`[useLoadModuleList] ${errorMsg}`);
          setError(errorMsg);
        }
      } catch (err) {
        const errorMsg = `Failed to fetch module list: ${String(err)}`;
        logger.error(`[useLoadModuleList] ${errorMsg}`);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadModuleList();
  }, [projectId]);

  return {error, isLoading};
}
