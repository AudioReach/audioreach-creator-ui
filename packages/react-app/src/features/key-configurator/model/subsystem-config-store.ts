/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {SubsystemKey} from '../subsystem-configurator-view';

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

  fetchSubsystemConfig: (subsystemId: number) => Promise<void>;
  // Actions
  initialize: (projectId: string) => void;
  // State
  projectId: string; // Current project ID (set during initialization)
  removeConfiguredKey: (subsystemId: number, keyId: number) => void;
  reset: () => void;
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

    fetchSubsystemConfig: (subsystemId: number): Promise<void> => {
      const state = get();

      if (!state.projectId) {
        logger.error('ProjectId not set. Call initialize() first', {
          action: 'fetch_subsystem_config',
          component: 'SubsystemConfigStore',
        });
        return Promise.resolve();
      }

      // Check if this subsystem is already in cache
      const cachedSubsystem = state.configuredKeys.find(
        (c) => c.subsystemId === subsystemId,
      );

      // If both available keys and this subsystem's config are cached, no need to fetch
      if (state.availableKeys && cachedSubsystem) {
        logger.info('Subsystem configuration loaded from cache', {
          action: 'fetch_subsystem_config',
          component: 'SubsystemConfigStore',
          projectId: state.projectId,
        });
        return Promise.resolve();
      }

      // Fetch from backend

      // TODO: Implement backend API call and data transformation
      // 1. Call backend API: GET /projects/{projectId}/subsystems/{subsystemId}/config
      // 2. Transform backend response to UI format (SubsystemConfigResponse)
      // 3. Update availableKeys if not already loaded
      // 4. Add/update this subsystem's entry in configuredKeys array
      //
      // Example structure:
      // const result = await httpClient.get<BackendSubsystemConfigResponse>(...)
      // const transformedData = transformBackendToUIFormat(result.data)
      //
      // const newConfiguredKeys = [...state.configuredKeys]
      // const existingIndex = newConfiguredKeys.findIndex(c => c.subsystemId === subsystemId)
      // const newEntry = {
      //   subsystemId,
      //   configuredKeys: transformedData.configuredKeys,
      // }
      // if (existingIndex >= 0) {
      //   newConfiguredKeys[existingIndex] = newEntry
      // } else {
      //   newConfiguredKeys.push(newEntry)
      // }
      //
      // set({
      //   availableKeys: state.availableKeys || transformedData.availableKeys,
      //   configuredKeys: newConfiguredKeys,
      //   error: null,
      //   isLoading: false,
      // })

      logger.warn('Backend API call not yet implemented', {
        action: 'fetch_subsystem_config',
        component: 'SubsystemConfigStore',
        projectId: state.projectId,
      });
      return Promise.resolve();
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
