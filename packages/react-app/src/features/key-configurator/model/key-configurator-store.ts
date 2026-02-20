/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';

import {logger} from '~shared/lib/logger';
import {
  type ConfigurationItem,
  ConfigurationItemType,
} from '~widgets/configurator-panel';

import {useCalibrationKeysStore} from './calibration-keys-store';
import {moduleInstanceCoordinator} from './module-instance-coordinator';
import {useModuleTagKeysStore} from './module-tag-keys-store';
import {useSubgraphConfigStore} from './subgraph-config-store';
import {useSubsystemConfigStore} from './subsystem-config-store';

/**
 * Base context information for configuration sessions
 */
interface BaseConfigurationContext {
  entityId: number; // moduleId, subgraphId, or subsystemId
  systemId: string;
}

/**
 * Module configuration context - includes required instanceId
 */
export interface ModuleConfigurationContext extends BaseConfigurationContext {
  entityType: ConfigurationItemType.MODULE;
  instanceId: number;
}

/**
 * Subgraph configuration context
 */
export interface SubgraphConfigurationContext extends BaseConfigurationContext {
  entityType: ConfigurationItemType.SUBGRAPH;
}

/**
 * Subsystem configuration context
 */
export interface SubsystemConfigurationContext
  extends BaseConfigurationContext {
  entityType: ConfigurationItemType.SUBSYSTEM;
}

/**
 * Discriminated union of all configuration context types
 */
export type ConfigurationContext =
  | ModuleConfigurationContext
  | SubgraphConfigurationContext
  | SubsystemConfigurationContext;

export interface KeyConfiguratorStore {
  clearSelection: () => void;
  // Actions
  initializeConfiguration: (context: ConfigurationContext) => Promise<boolean>;
  isEditable: boolean;

  // State
  projectId: string;
  resetConfiguration: () => void;
  saveConfiguration: () => Promise<boolean>;

  selectedItems: ConfigurationItem[];
  // Edit mode actions
  setIsEditable: (editable: boolean) => void;

  // Selection actions
  setSelectedItems: (items: ConfigurationItem[]) => void;
  toggleIsEditable: () => void;
}

/**
 * Factory function to create KeyConfigurator store instances
 * Used by store manager to create per-project instances
 */
export function createKeyConfiguratorStore(projectId: string) {
  return create<KeyConfiguratorStore>()(
    subscribeWithSelector((set, get) => ({
      clearSelection: () => {
        set({selectedItems: []});
        logger.debug('Selection cleared', {
          action: 'clear_selection',
          component: 'KeyConfiguratorStore',
          projectId: get().projectId,
        });
      },
      initializeConfiguration: async (context: ConfigurationContext) => {
        const state = get();

        if (!state.projectId) {
          logger.error('ProjectId not set. Call initialize() first', {
            action: 'initialize_configuration',
            component: 'KeyConfiguratorStore',
          });
          return false;
        }

        try {
          // Fetch data based on entity type
          switch (context.entityType) {
            case ConfigurationItemType.MODULE: {
              const ckvStore = useCalibrationKeysStore.getState();
              const tkvStore = useModuleTagKeysStore.getState();

              // Initialize CKV store if not already initialized
              if (!ckvStore.projectId) {
                const ckvInitSuccess = await ckvStore.initialize(
                  state.projectId,
                );
                if (!ckvInitSuccess) {
                  logger.error('Failed to initialize calibration keys store', {
                    action: 'initialize_configuration',
                    component: 'KeyConfiguratorStore',
                    projectId: state.projectId,
                  });
                  return false;
                }
              }

              // Initialize TKV store if not already initialized
              if (!tkvStore.projectId) {
                const tkvInitSuccess = await tkvStore.initialize(
                  state.projectId,
                );
                if (!tkvInitSuccess) {
                  logger.error('Failed to initialize module tag keys store', {
                    action: 'initialize_configuration',
                    component: 'KeyConfiguratorStore',
                    projectId: state.projectId,
                  });
                  return false;
                }
              }

              // Use coordinator to fetch and distribute data to both stores
              const result =
                await moduleInstanceCoordinator.fetchAndDistributeModuleInstanceData(
                  state.projectId,
                  context.entityId,
                  context.instanceId,
                  context.systemId,
                );

              if (!result.success) {
                logger.error(
                  'Failed to fetch module instance data via coordinator',
                  {
                    action: 'initialize_configuration',
                    component: 'KeyConfiguratorStore',
                    error: result.error,
                    projectId: state.projectId,
                  },
                );
                return false;
              }
              break;
            }

            case ConfigurationItemType.SUBGRAPH: {
              const store = useSubgraphConfigStore.getState();
              if (!store.projectId) {
                const initSuccess = await store.initialize(state.projectId);
                if (!initSuccess) {
                  logger.error('Failed to initialize subgraph config store', {
                    action: 'initialize_configuration',
                    component: 'KeyConfiguratorStore',
                    projectId: state.projectId,
                  });
                  return false;
                }
              }
              break;
            }

            case ConfigurationItemType.SUBSYSTEM: {
              const store = useSubsystemConfigStore.getState();
              if (!store.projectId) {
                store.initialize(state.projectId);
              }
              break;
            }
          }

          logger.info('Key configurator initialized successfully', {
            action: 'initialize_configuration',
            component: 'KeyConfiguratorStore',
            projectId: state.projectId,
          });
          return true;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          logger.error('Failed to initialize key configurator', {
            action: 'initialize_configuration',
            component: 'KeyConfiguratorStore',
            error: errorMessage,
            projectId: state.projectId,
          });
          return false;
        }
      },
      isEditable: false, // Default to non-editable mode

      projectId,

      resetConfiguration: () => {
        logger.info('Resetting all configurations', {
          action: 'reset_configuration',
          component: 'KeyConfiguratorStore',
        });

        // Reset all individual stores
        useCalibrationKeysStore.getState().reset();
        useModuleTagKeysStore.getState().reset();
        useSubgraphConfigStore.getState().reset();
        useSubsystemConfigStore.getState().reset();

        // Reset main store
        set({
          projectId: '',
          selectedItems: [], // NEW: Also reset selection
        });
      },

      saveConfiguration: async () => {
        const state = get();
        const {projectId} = state;

        if (!projectId) {
          logger.error('ProjectId not set. Call initialize() first', {
            action: 'save_all_configurations',
            component: 'KeyConfiguratorStore',
          });
          return false;
        }

        logger.info('Saving all configurations', {
          action: 'save_all_configurations',
          component: 'KeyConfiguratorStore',
          projectId,
        });

        try {
          // Save all stores in parallel
          const results = await Promise.all([
            useCalibrationKeysStore.getState().saveToBackend(),
            useModuleTagKeysStore.getState().saveToBackend(),
            useSubgraphConfigStore.getState().saveToBackend(),
            useSubsystemConfigStore.getState().saveToBackend(),
          ]);

          // Check if all saves succeeded
          const success = results.every((result) => result);

          if (success) {
            logger.info('All configurations saved successfully', {
              action: 'save_all_configurations',
              component: 'KeyConfiguratorStore',
              projectId,
            });
            return true;
          } else {
            logger.error('Failed to save some configurations', {
              action: 'save_all_configurations',
              component: 'KeyConfiguratorStore',
              projectId,
            });
            return false;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          logger.error('Error saving configurations', {
            action: 'save_all_configurations',
            component: 'KeyConfiguratorStore',
            error: errorMessage,
            projectId,
          });
          return false;
        }
      },

      selectedItems: [],

      setIsEditable: (editable: boolean) => {
        set({isEditable: editable});
        logger.debug(`Edit mode ${editable ? 'enabled' : 'disabled'}`, {
          action: 'set_is_editable',
          component: 'KeyConfiguratorStore',
          projectId: get().projectId,
        });
      },

      // NEW: Selection actions
      setSelectedItems: (items) => {
        set({selectedItems: items});
        logger.debug(`Selection updated: ${items.length} items`, {
          action: 'set_selected_items',
          component: 'KeyConfiguratorStore',
          projectId: get().projectId,
        });
      },

      toggleIsEditable: () => {
        const currentState = get().isEditable;
        set({isEditable: !currentState});
        logger.debug(
          `Edit mode toggled to ${!currentState ? 'enabled' : 'disabled'}`,
          {
            action: 'toggle_is_editable',
            component: 'KeyConfiguratorStore',
            projectId: get().projectId,
          },
        );
      },
    })),
  );
}
