/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {getAllKeyDefinitions} from '~entities/key-definitions';
import {logger} from '~shared/lib/logger';

import {
  type CalibrationKey,
  type CkvParameter,
  type ConfiguredCkv,
  transformKeyDefinitionsToCalibrationKeys,
} from '../module-configurator-view/ui/calibration-keys';

// Cache entry for configured key values (per module instance) - also serves as working state
interface ConfiguredKeyValues {
  instanceId: number;
  keyValueList: ConfiguredCkv[];
}

interface CalibrationKeysStore {
  addConfiguredKey: (
    moduleId: number,
    instanceId: number,
    key: ConfiguredCkv,
  ) => void;
  availableKeys: Record<string, CalibrationKey> | null; // Project-wide available keys (loaded once, shared across all modules)
  clearCache: () => void;
  configuredKeyValuesMap: Record<number, ConfiguredKeyValues[]>; // Map of moduleId to array of ConfiguredKeyValues (one per instance)
  // Actions
  initialize: (projectId: string) => Promise<boolean>;

  moduleParameters: Record<number, CkvParameter[]>; // Map of moduleId to parameters (parameter definitions are per module, shared across instances)
  // State
  projectId: string; // Current project ID (set during initialization)
  removeConfiguredKey: (
    moduleId: number,
    instanceId: number,
    index: number,
  ) => void;
  reset: () => void;
  saveToBackend: () => Promise<boolean>;
  setDataFromCoordinator: (
    moduleId: number,
    instanceId: number,
    keyValueList: ConfiguredCkv[],
    parameters: CkvParameter[],
  ) => void;
  updateConfiguredKeyValues: (
    moduleId: number,
    instanceId: number,
    keyValueList: ConfiguredCkv[],
  ) => void;
  updateModuleParameters: (
    moduleId: number,
    parameters: CkvParameter[],
  ) => void;
}

const initialState = {
  availableKeys: null,
  configuredKeyValuesMap: {},
  moduleParameters: {},
  projectId: '',
};

export const useCalibrationKeysStore = create<CalibrationKeysStore>(
  (set, get) => ({
    ...initialState,

    addConfiguredKey: (
      moduleId: number,
      instanceId: number,
      key: ConfiguredCkv,
    ) => {
      const state = get();
      const moduleInstances = state.configuredKeyValuesMap[moduleId];

      if (moduleInstances) {
        const instance = moduleInstances.find(
          (inst) => inst.instanceId === instanceId,
        );
        if (instance) {
          const updatedKeyValueList = [...instance.keyValueList, key];
          get().updateConfiguredKeyValues(
            moduleId,
            instanceId,
            updatedKeyValueList,
          );
        } else {
          // Create new entry for this instance
          get().updateConfiguredKeyValues(moduleId, instanceId, [key]);
        }
      } else {
        // Create new entry for this module and instance
        get().updateConfiguredKeyValues(moduleId, instanceId, [key]);
      }
    },

    clearCache: () => {
      set({
        availableKeys: null,
        configuredKeyValuesMap: {},
      });
      logger.info('Calibration keys cache cleared', {
        action: 'clear_cache',
        component: 'CalibrationKeysStore',
      });
    },

    initialize: async (projectId: string) => {
      set({projectId});
      logger.info('Calibration keys store initialized', {
        action: 'initialize',
        component: 'CalibrationKeysStore',
        projectId,
      });

      try {
        // Fetch key definitions from backend
        const result = await getAllKeyDefinitions(projectId);

        if (result.success && result.data) {
          // Transform to UI format
          const availableKeys = transformKeyDefinitionsToCalibrationKeys(
            result.data,
          );

          set({availableKeys});

          logger.info(`Available keys loaded successfully`, {
            action: 'initialize',
            component: 'CalibrationKeysStore',
            projectId,
          });
          return true;
        } else {
          const errorMessage =
            result.errors?.join(', ') ||
            result.message ||
            'Failed to fetch key definitions';

          logger.error('Failed to load key definitions', {
            action: 'initialize',
            component: 'CalibrationKeysStore',
            error: errorMessage,
            projectId,
          });
          return false;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        logger.error('Error loading key definitions', {
          action: 'initialize',
          component: 'CalibrationKeysStore',
          error: errorMessage,
          projectId,
        });
        return false;
      }
    },

    removeConfiguredKey: (
      moduleId: number,
      instanceId: number,
      index: number,
    ) => {
      const state = get();
      const moduleInstances = state.configuredKeyValuesMap[moduleId];
      if (!moduleInstances) {
        return;
      }

      const instance = moduleInstances.find(
        (inst) => inst.instanceId === instanceId,
      );
      if (!instance) {
        return;
      }

      const updatedKeyValueList = instance.keyValueList.filter(
        (_, i) => i !== index,
      );
      get().updateConfiguredKeyValues(
        moduleId,
        instanceId,
        updatedKeyValueList,
      );
    },

    reset: () => {
      set(initialState);
    },

    saveToBackend: (): Promise<boolean> => {
      const state = get();

      if (!state.projectId) {
        logger.error('ProjectId not set. Call initialize() first', {
          action: 'save_to_backend',
          component: 'CalibrationKeysStore',
        });
        return Promise.resolve(false);
      }

      try {
        // TODO: Implement batch save to backend
        logger.warn('Backend save not yet implemented', {
          action: 'save_to_backend',
          component: 'CalibrationKeysStore',
          projectId: state.projectId,
        });

        return Promise.resolve(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error saving to backend', {
          action: 'save_to_backend',
          component: 'CalibrationKeysStore',
          error: errorMessage,
          projectId: state.projectId,
        });
        return Promise.resolve(false);
      }
    },

    setDataFromCoordinator: (
      moduleId: number,
      instanceId: number,
      keyValueList: ConfiguredCkv[],
      ckvParameters: CkvParameter[],
    ) => {
      // This method is called by the module instance coordinator to set data
      // It's similar to updateConfiguredKeyValues but specifically for coordinator use
      const state = get();
      const newConfiguredKeyValuesMap = {...state.configuredKeyValuesMap};
      const moduleInstances = newConfiguredKeyValuesMap[moduleId] || [];
      const existingIndex = moduleInstances.findIndex(
        (inst) => inst.instanceId === instanceId,
      );

      const newEntry: ConfiguredKeyValues = {
        instanceId,
        keyValueList,
      };

      if (existingIndex >= 0) {
        moduleInstances[existingIndex] = newEntry;
      } else {
        moduleInstances.push(newEntry);
      }

      newConfiguredKeyValuesMap[moduleId] = moduleInstances;

      // Update parameters based on the first configured key's pidConfig
      let updatedParameters = ckvParameters;
      if (keyValueList.length > 0 && keyValueList[0].pidConfig) {
        const pidConfigSet = new Set(keyValueList[0].pidConfig);
        updatedParameters = ckvParameters.map((param) => ({
          ...param,
          checked: pidConfigSet.has(param.pid),
        }));
      }

      // Update module parameters (per module, not per instance)
      const newModuleParameters = {...state.moduleParameters};
      newModuleParameters[moduleId] = updatedParameters;

      set({
        configuredKeyValuesMap: newConfiguredKeyValuesMap,
        moduleParameters: newModuleParameters,
      });

      logger.info(
        `Data set from coordinator for module ${moduleId}:${instanceId} with ${updatedParameters.length} parameters`,
        {
          action: 'set_data_from_coordinator',
          component: 'CalibrationKeysStore',
          projectId: state.projectId,
        },
      );
    },

    updateConfiguredKeyValues: (
      moduleId: number,
      instanceId: number,
      keyValueList: ConfiguredCkv[],
    ) => {
      const state = get();
      const newConfiguredKeyValuesMap = {...state.configuredKeyValuesMap};
      const moduleInstances = newConfiguredKeyValuesMap[moduleId] || [];
      const existingIndex = moduleInstances.findIndex(
        (inst) => inst.instanceId === instanceId,
      );

      const newEntry: ConfiguredKeyValues = {
        instanceId,
        keyValueList,
      };

      if (existingIndex >= 0) {
        moduleInstances[existingIndex] = newEntry;
      } else {
        moduleInstances.push(newEntry);
      }

      newConfiguredKeyValuesMap[moduleId] = moduleInstances;
      set({configuredKeyValuesMap: newConfiguredKeyValuesMap});
    },

    updateModuleParameters: (moduleId: number, parameters: CkvParameter[]) => {
      const state = get();
      const newModuleParameters = {...state.moduleParameters};
      newModuleParameters[moduleId] = parameters;

      set({moduleParameters: newModuleParameters});

      logger.info(
        `Module parameters updated for module ${moduleId} with ${parameters.length} parameters`,
        {
          action: 'update_module_parameters',
          component: 'CalibrationKeysStore',
          projectId: state.projectId,
        },
      );
    },
  }),
);
