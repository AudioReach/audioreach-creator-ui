/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {getAllTagDefinitions} from '~entities/key-definitions/api/key-definition-api';
import {logger} from '~shared/lib/logger';

import {
  type ConfiguredTkv,
  type TagGroup,
  type TkvParameter,
  transformTagDefinitionsToTagGroups,
} from '../module-configurator-view/ui/module-tag-keys';

// Cache entry for configured tag key values (per module instance) - also serves as working state
interface ConfiguredTagKeyValues {
  instanceId: number;
  tagKeyValueList: ConfiguredTkv[];
}

interface ModuleTagKeysStore {
  addConfiguredTagKeyValue: (
    moduleId: number,
    instanceId: number,
    key: ConfiguredTkv,
  ) => void;
  availableModuleTags: Record<string, TagGroup> | null; // Project-wide available module tags (loaded once, shared across all modules)
  clearCache: () => void;
  configuredModuleTags: Record<number, ConfiguredTagKeyValues[]>; // Map of moduleId to array of ConfiguredTagKeyValues (one per instance)
  // Actions
  initialize: (projectId: string) => Promise<boolean>;

  moduleParameters: Record<number, TkvParameter[]>; // Map of moduleId to parameters (parameter definitions are per module, shared across instances)
  // State
  projectId: string; // Current project ID (set during initialization)
  removeConfiguredTagKeyValue: (
    moduleId: number,
    instanceId: number,
    index: number,
  ) => void;
  reset: () => void;
  saveToBackend: () => Promise<boolean>;
  setDataFromCoordinator: (
    moduleId: number,
    instanceId: number,
    tagKeyValueList: ConfiguredTkv[],
    parameters: TkvParameter[],
  ) => void;
  updateConfiguredTagKeyValues: (
    moduleId: number,
    instanceId: number,
    tagKeyValueList: ConfiguredTkv[],
  ) => void;
}

const initialState = {
  availableModuleTags: null,
  configuredModuleTags: {},
  moduleParameters: {},
  projectId: '',
};

export const useModuleTagKeysStore = create<ModuleTagKeysStore>((set, get) => ({
  ...initialState,

  addConfiguredTagKeyValue: (
    moduleId: number,
    instanceId: number,
    key: ConfiguredTkv,
  ) => {
    const state = get();
    const moduleInstances = state.configuredModuleTags[moduleId];

    if (moduleInstances) {
      const instance = moduleInstances.find(
        (inst) => inst.instanceId === instanceId,
      );
      if (instance) {
        const updatedTagKeyValueList = [...instance.tagKeyValueList, key];
        get().updateConfiguredTagKeyValues(
          moduleId,
          instanceId,
          updatedTagKeyValueList,
        );
      } else {
        // Create new entry for this instance
        get().updateConfiguredTagKeyValues(moduleId, instanceId, [key]);
      }
    } else {
      // Create new entry for this module and instance
      get().updateConfiguredTagKeyValues(moduleId, instanceId, [key]);
    }
  },

  clearCache: () => {
    set({
      availableModuleTags: null,
      configuredModuleTags: {},
    });
    logger.info('Module tag keys cache cleared', {
      action: 'clear_cache',
      component: 'ModuleTagKeysStore',
    });
  },

  initialize: async (projectId: string) => {
    set({projectId});
    logger.info('Module tag keys store initialized', {
      action: 'initialize',
      component: 'ModuleTagKeysStore',
      projectId,
    });

    try {
      // Fetch tag definitions from backend
      const result = await getAllTagDefinitions(projectId);

      if (result.success && result.data) {
        // Transform to UI format (result.data is an array)
        const availableModuleTags = transformTagDefinitionsToTagGroups(
          result.data,
        );

        set({availableModuleTags});

        logger.info(
          `Available module tags loaded successfully: ${Object.keys(availableModuleTags).length} tags`,
          {
            action: 'initialize',
            component: 'ModuleTagKeysStore',
            projectId,
          },
        );
        return true;
      } else {
        const errorMessage =
          result.errors?.join(', ') ||
          result.message ||
          'Failed to fetch tag definitions';

        logger.error('Failed to load tag definitions', {
          action: 'initialize',
          component: 'ModuleTagKeysStore',
          error: errorMessage,
          projectId,
        });
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error loading tag definitions', {
        action: 'initialize',
        component: 'ModuleTagKeysStore',
        error: errorMessage,
        projectId,
      });
      return false;
    }
  },

  removeConfiguredTagKeyValue: (
    moduleId: number,
    instanceId: number,
    index: number,
  ) => {
    const state = get();
    const moduleInstances = state.configuredModuleTags[moduleId];
    if (!moduleInstances) {
      return;
    }

    const instance = moduleInstances.find(
      (inst) => inst.instanceId === instanceId,
    );
    if (!instance) {
      return;
    }

    const updatedTagKeyValueList = instance.tagKeyValueList.filter(
      (_, i) => i !== index,
    );
    get().updateConfiguredTagKeyValues(
      moduleId,
      instanceId,
      updatedTagKeyValueList,
    );
  },

  reset: () => {
    set(initialState);
  },

  saveToBackend: async () => {
    const state = get();

    if (!state.projectId) {
      logger.error('ProjectId not set. Call initialize() first', {
        action: 'save_to_backend',
        component: 'ModuleTagKeysStore',
      });
      return false;
    }

    try {
      // TODO: Implement batch save to backend
      // Send all module instances' configured tag key values to backend
      //
      // Example structure:
      // const promises: Promise<ApiResult<void>>[] = []
      // Object.entries(state.configuredModuleTags).forEach(([moduleId, instances]) => {
      //   instances.forEach(instance => {
      //     promises.push(
      //       httpClient.post(
      //         `/projects/${state.projectId}/modules/${moduleId}/instances/${instance.instanceId}/tag-keys`,
      //         { configuredKeys: instance.tagKeyValueList }
      //       )
      //     )
      //   })
      // })
      // const results = await Promise.all(promises)
      // const allSuccessful = results.every(r => r.success)

      logger.warn('Backend save not yet implemented', {
        action: 'save_to_backend',
        component: 'ModuleTagKeysStore',
        projectId: state.projectId,
      });

      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error saving to backend', {
        action: 'save_to_backend',
        component: 'ModuleTagKeysStore',
        error: errorMessage,
        projectId: state.projectId,
      });
      return false;
    }
  },

  setDataFromCoordinator: (
    moduleId: number,
    instanceId: number,
    tagKeyValueList: ConfiguredTkv[],
    parameters: TkvParameter[],
  ) => {
    // This method is called by the module instance coordinator to set data
    const state = get();
    const newConfiguredModuleTags = {...state.configuredModuleTags};
    const moduleInstances = newConfiguredModuleTags[moduleId] || [];
    const existingIndex = moduleInstances.findIndex(
      (inst) => inst.instanceId === instanceId,
    );

    const newEntry: ConfiguredTagKeyValues = {
      instanceId,
      tagKeyValueList,
    };

    if (existingIndex >= 0) {
      moduleInstances[existingIndex] = newEntry;
    } else {
      moduleInstances.push(newEntry);
    }

    newConfiguredModuleTags[moduleId] = moduleInstances;

    // Update module parameters (per module, not per instance)
    const newModuleParameters = {...state.moduleParameters};
    newModuleParameters[moduleId] = parameters;

    set({
      configuredModuleTags: newConfiguredModuleTags,
      moduleParameters: newModuleParameters,
    });

    logger.info(
      `Data set from coordinator for module ${moduleId}:${instanceId} with ${parameters.length} parameters`,
      {
        action: 'set_data_from_coordinator',
        component: 'ModuleTagKeysStore',
        projectId: state.projectId,
      },
    );
  },

  updateConfiguredTagKeyValues: (
    moduleId: number,
    instanceId: number,
    tagKeyValueList: ConfiguredTkv[],
  ) => {
    const state = get();
    const newConfiguredModuleTags = {...state.configuredModuleTags};
    const moduleInstances = newConfiguredModuleTags[moduleId] || [];
    const existingIndex = moduleInstances.findIndex(
      (inst) => inst.instanceId === instanceId,
    );

    const newEntry: ConfiguredTagKeyValues = {
      instanceId,
      tagKeyValueList,
    };

    if (existingIndex >= 0) {
      moduleInstances[existingIndex] = newEntry;
    } else {
      moduleInstances.push(newEntry);
    }

    newConfiguredModuleTags[moduleId] = moduleInstances;
    set({configuredModuleTags: newConfiguredModuleTags});
  },
}));
