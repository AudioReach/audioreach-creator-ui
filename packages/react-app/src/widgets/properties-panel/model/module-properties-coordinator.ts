/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fetchSpfModuleProperties} from '~entities/spf-modules';
import {hasBlockingIssues} from '~shared/api';

import {
  propertiesEntryKey,
  usePropertiesPanelStore,
} from './use-properties-panel-store';

export async function refreshCachedModulePropertiesForContainer(
  projectId: string,
  moduleIds: string[],
): Promise<void> {
  const store = usePropertiesPanelStore.getState();
  const cachedModuleIds = moduleIds.filter((moduleId) => {
    const key = propertiesEntryKey(projectId, 'module', moduleId);
    return store.entries[key] !== undefined;
  });

  await Promise.allSettled(
    cachedModuleIds.map(async (moduleId) => {
      const result = await fetchSpfModuleProperties(projectId, [moduleId]);
      if (!hasBlockingIssues(result) && result.data) {
        usePropertiesPanelStore
          .getState()
          .replaceProperties(projectId, 'module', moduleId, result.data);
      }
    }),
  );
}
