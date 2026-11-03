/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {getAllKeyDefinitions} from '~entities/key-definitions';
import {setSubsystemFilteredKeys} from '~entities/subsystems';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {logger} from '~shared/lib/logger';
import type {Key as SubsystemKey} from '~shared/types/key-configurator-config.types';

// Cache entry for configured keys (per subsystem) - also serves as working state
interface ConfiguredKeys {
  keys: SubsystemKey[];
  subsystemId: number;
}

interface SubsystemConfigStore {
  addConfiguredKey: (subsystemId: number, key: SubsystemKey) => void;
  availableKeys: SubsystemKey[] | null; // Project-wide available keys (loaded once, shared across all subsystems)
  clearCache: () => void;
  configuredKeys: ConfiguredKeys[]; // Array of all subsystems' configured keys (cache + working state combined)

  fetchSubsystemConfig: (
    subsystemId: number,
    backendKeys: SubsystemKey[],
  ) => Promise<void>;
  // Actions
  initialize: (projectId: string) => void;
  // State
  projectId: string; // Current project ID (set during initialization)
  removeConfiguredKey: (subsystemId: number, keyId: number) => void;
  reset: () => void;
  saveFilteredKeys: (
    subsystemId: number,
    subsystemSystemId: string,
    keys: SubsystemKey[],
  ) => Promise<boolean>;
  saveToBackend: () => Promise<boolean>;
  updateConfiguredKeys: (subsystemId: number, keys: SubsystemKey[]) => void;
}

const initialState = {
  availableKeys: null,
  configuredKeys: [],
  projectId: '',
};

export const useSubsystemConfigStore = create<SubsystemConfigStore>(
  (set, get) => ({
    ...initialState,

    addConfiguredKey: (subsystemId: number, key: SubsystemKey) => {
      const state = get();
      const subsystem = state.configuredKeys.find(
        (c) => c.subsystemId === subsystemId,
      );

      if (subsystem) {
        // Check if key already exists
        const exists = subsystem.keys.some(
          (k: SubsystemKey) => k.id === key.id,
        );
        if (!exists) {
          const updatedKeys = [...subsystem.keys, key];
          get().updateConfiguredKeys(subsystemId, updatedKeys);
        }
      } else {
        // Create new entry for this subsystem
        get().updateConfiguredKeys(subsystemId, [key]);
      }
    },

    clearCache: () => {
      set({
        availableKeys: null,
        configuredKeys: [],
      });
      logger.info('Subsystem configuration cache cleared', {
        action: 'clear_cache',
        component: 'SubsystemConfigStore',
      });
    },

    fetchSubsystemConfig: async (
      subsystemId: number,
      backendKeys: SubsystemKey[],
    ): Promise<void> => {
      const {configuredKeys, projectId} = get();

      if (!projectId) {
        logger.error('ProjectId not set. Call initialize() first', {
          action: 'fetch_subsystem_config',
          component: 'SubsystemConfigStore',
        });
        return;
      }

      // Seed this subsystem with the keys the backend already has. Cached
      // entries hold unsaved working state, so never overwrite them.
      if (!configuredKeys.some((c) => c.subsystemId === subsystemId)) {
        get().updateConfiguredKeys(subsystemId, backendKeys);
      }

      // Available keys are project-wide: load once, share across subsystems.
      if (get().availableKeys) {
        return;
      }

      try {
        const result = await getAllKeyDefinitions(projectId);

        if (hasBlockingIssues(result) || !result.data) {
          logger.error('Failed to load key definitions', {
            action: 'fetch_subsystem_config',
            component: 'SubsystemConfigStore',
            error: getIssueMessage(result, 'Failed to fetch key definitions'),
            projectId,
          });
          return;
        }

        set({
          availableKeys: result.data
            .filter((definition) => definition.isGraphKey)
            .map((definition) => ({
              id: definition.naturalId,
              name: definition.name,
              systemId: definition.systemId,
            })),
        });
      } catch (error) {
        logger.error('Error loading key definitions', {
          action: 'fetch_subsystem_config',
          component: 'SubsystemConfigStore',
          error: error instanceof Error ? error.message : 'Unknown error',
          projectId,
        });
      }
    },

    initialize: (projectId: string) => {
      set({projectId});
      logger.info('Subsystem config store initialized', {
        action: 'initialize',
        component: 'SubsystemConfigStore',
        projectId,
      });
    },

    removeConfiguredKey: (subsystemId: number, keyId: number) => {
      const state = get();
      const subsystem = state.configuredKeys.find(
        (c) => c.subsystemId === subsystemId,
      );

      if (subsystem) {
        const updatedKeys = subsystem.keys.filter(
          (k: SubsystemKey) => k.id !== keyId,
        );
        get().updateConfiguredKeys(subsystemId, updatedKeys);
      }
    },

    reset: () => {
      set(initialState);
    },

    saveFilteredKeys: async (
      subsystemId: number,
      subsystemSystemId: string,
      keys: SubsystemKey[],
    ): Promise<boolean> => {
      const {projectId} = get();

      try {
        const result = await setSubsystemFilteredKeys(
          projectId,
          subsystemSystemId,
          {
            keySystemIds: keys.map((key) => key.systemId),
          },
        );

        if (hasBlockingIssues(result)) {
          logger.error('Failed to save filtered keys', {
            action: 'save_filtered_keys',
            component: 'SubsystemConfigStore',
            projectId,
          });
          return false;
        }

        const savedKeys = result.data
          ? result.data.filteredKeys.map((key) => ({
              id: key.naturalId,
              name: key.name,
              systemId: key.systemId,
            }))
          : keys;

        get().updateConfiguredKeys(subsystemId, savedKeys);
        return true;
      } catch {
        return false;
      }
    },

    saveToBackend: (): Promise<boolean> => {
      const state = get();

      if (!state.projectId) {
        logger.error('ProjectId not set. Call initialize() first', {
          action: 'save_to_backend',
          component: 'SubsystemConfigStore',
        });
        return Promise.resolve(false);
      }

      try {
        // TODO: Implement batch save to backend
        // Send all subsystems' configured keys to backend
        //
        // Example structure:
        // const promises = state.configuredKeys.map(entry =>
        //   httpClient.post(
        //     `/projects/${state.projectId}/subsystems/${entry.subsystemId}/config`,
        //     { configuredKeys: entry.configuredKeys }
        //   )
        // )
        // const results = await Promise.all(promises)
        // const allSuccessful = results.every(r => r.success)

        logger.warn('Backend save not yet implemented', {
          action: 'save_to_backend',
          component: 'SubsystemConfigStore',
          projectId: state.projectId,
        });

        return Promise.resolve(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error saving to backend', {
          action: 'save_to_backend',
          component: 'SubsystemConfigStore',
          error: errorMessage,
          projectId: state.projectId,
        });
        return Promise.resolve(false);
      }
    },

    updateConfiguredKeys: (subsystemId: number, keys: SubsystemKey[]) => {
      const state = get();
      const newConfiguredKeys = [...state.configuredKeys];
      const existingIndex = newConfiguredKeys.findIndex(
        (c) => c.subsystemId === subsystemId,
      );

      const newEntry = {
        keys,
        subsystemId,
      };

      if (existingIndex >= 0) {
        newConfiguredKeys[existingIndex] = newEntry;
      } else {
        newConfiguredKeys.push(newEntry);
      }

      set({configuredKeys: newConfiguredKeys});
    },
  }),
);
