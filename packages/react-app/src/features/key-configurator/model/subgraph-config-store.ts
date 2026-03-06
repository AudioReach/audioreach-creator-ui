/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {getAllKeyDefinitions} from '~entities/key-definitions/api/key-definition-api';
import {logger} from '~shared/lib/logger';
import type {GraphKey} from '~shared/types/key-configurator-config.types';

import {
  type ConfiguredSubgraphKeyValue,
  transformKeyDefinitionsToGraphKeys,
} from '../subgraph-configurator-view';

// Cache entry for configured key values (per subgraph) - also serves as working state
interface ConfiguredKeyValues {
  keyValueList: ConfiguredSubgraphKeyValue[];
  subgraphId: number;
}

interface SubgraphConfigStore {
  addConfiguredKey: (
    subgraphId: number,
    key: ConfiguredSubgraphKeyValue,
  ) => void;
  availableKeys: Record<string, GraphKey> | null; // Project-wide available keys (loaded once, shared across all subgraphs)
  clearCache: () => void;
  configuredKeyValues: ConfiguredKeyValues[]; // Array of all subgraphs' configured key values (cache + working state combined)

  // Actions
  initialize: (projectId: string) => Promise<boolean>;
  // State
  projectId: string; // Current project ID (set during initialization)
  reset: () => void;
  saveToBackend: () => Promise<boolean>;
  updateConfiguredKeyValues: (
    subgraphId: number,
    keyvalueList: ConfiguredSubgraphKeyValue[],
  ) => void;
}

const initialState = {
  availableKeys: null,
  configuredKeyValues: [],
  projectId: '',
};

export const useSubgraphConfigStore = create<SubgraphConfigStore>(
  (set, get) => ({
    ...initialState,

    addConfiguredKey: (subgraphId: number, key: ConfiguredSubgraphKeyValue) => {
      const state = get();
      const subgraph = state.configuredKeyValues.find(
        (c) => c.subgraphId === subgraphId,
      );

      if (subgraph) {
        const updatedKeyValueList = [...subgraph.keyValueList, key];
        get().updateConfiguredKeyValues(subgraphId, updatedKeyValueList);
      } else {
        // Create new entry for this subgraph
        get().updateConfiguredKeyValues(subgraphId, [key]);
      }
    },

    clearCache: () => {
      set({
        availableKeys: null,
        configuredKeyValues: [],
      });
      logger.info('Subgraph configuration cache cleared', {
        action: 'clear_cache',
        component: 'SubgraphConfigStore',
      });
    },

    initialize: async (projectId: string) => {
      set({projectId});
      logger.info('Subgraph config store initialized', {
        action: 'initialize',
        component: 'SubgraphConfigStore',
        projectId,
      });

      try {
        // Fetch key definitions from backend
        const result = await getAllKeyDefinitions(projectId);

        if (result.success && result.data) {
          // Transform to UI format (result.data is an array, filter for graph keys)
          const availableKeys = transformKeyDefinitionsToGraphKeys(result.data);

          set({availableKeys});

          logger.info(
            `Available graph keys loaded successfully: ${Object.keys(availableKeys).length} keys`,
            {
              action: 'initialize',
              component: 'SubgraphConfigStore',
              projectId,
            },
          );
          return true;
        } else {
          const errorMessage =
            result.errors?.join(', ') ||
            result.message ||
            'Failed to fetch key definitions';

          logger.error('Failed to load key definitions', {
            action: 'initialize',
            component: 'SubgraphConfigStore',
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
          component: 'SubgraphConfigStore',
          error: errorMessage,
          projectId,
        });
        return false;
      }
    },

    reset: () => {
      set(initialState);
    },

    saveToBackend: async () => {
      const state = get();

      if (!state.projectId) {
        logger.error('ProjectId not set. Call initialize() first', {
          action: 'save_to_backend',
          component: 'SubgraphConfigStore',
        });
        return false;
      }

      try {
        // TODO: Implement batch save to backend
        // Send all subgraphs' configured key values to backend
        //
        // Example structure:
        // const promises = state.configuredKeyValues.map(entry =>
        //   httpClient.post(
        //     `/projects/${state.projectId}/subgraphs/${entry.subgraphId}/key-vector-config`,
        //     { configuredKeys: entry.keyvalueList }
        //   )
        // )
        // const results = await Promise.all(promises)
        // const allSuccessful = results.every(r => r.success)

        logger.warn('Backend save not yet implemented', {
          action: 'save_to_backend',
          component: 'SubgraphConfigStore',
          projectId: state.projectId,
        });

        return false;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error saving to backend', {
          action: 'save_to_backend',
          component: 'SubgraphConfigStore',
          error: errorMessage,
          projectId: state.projectId,
        });
        return false;
      }
    },

    updateConfiguredKeyValues: (
      subgraphId: number,
      keyvalueList: ConfiguredSubgraphKeyValue[],
    ) => {
      const state = get();
      const newConfiguredKeyValues = [...state.configuredKeyValues];
      const existingIndex = newConfiguredKeyValues.findIndex(
        (c) => c.subgraphId === subgraphId,
      );

      const newEntry = {
        keyValueList: keyvalueList,
        subgraphId,
      };

      if (existingIndex === -1) {
        newConfiguredKeyValues.push(newEntry);
      } else {
        newConfiguredKeyValues[existingIndex] = newEntry;
      }

      set({configuredKeyValues: newConfiguredKeyValues});
    },
  }),
);
