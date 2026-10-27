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
} from './configurator-item.types';
import {useSubsystemConfigStore} from './subsystem-config-store';

/**
 * Owns existing module/subsystem configuration lifecycle and graph selection.
 * SGKV state stays in Graph Designer; this store only hosts selected item views.
 */
/**
 * Base context information for configuration sessions
 */
interface BaseConfigurationContext {
  entityId: number | string;
  systemId: string;
}

/**
 * Module configuration context for module-instance API lookups.
 */
export interface ModuleConfigurationContext extends BaseConfigurationContext {
  entityId: number;
  entityType: ConfigurationItemType.MODULE;
  moduleDefinitionSystemId: string;
}

/**
 * Subsystem configuration context
 */
export interface SubsystemConfigurationContext extends BaseConfigurationContext {
  entityType: ConfigurationItemType.SUBSYSTEM;
}

/** Configures modules/subsystems only; SGKV reads Graph Designer state directly. */
export type ConfigurationContext =
  ModuleConfigurationContext | SubsystemConfigurationContext;

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
      initializeConfiguration: (context: ConfigurationContext) => {
        const state = get();

        if (!state.projectId) {
          logger.error('ProjectId not set. Call initialize() first', {
            action: 'initialize_configuration',
            component: 'KeyConfiguratorStore',
          });
          return Promise.resolve(false);
        }

        try {
          // Fetch data based on entity type
          switch (context.entityType) {
            case ConfigurationItemType.SUBSYSTEM: {
              const store = useSubsystemConfigStore.getState();
              if (!store.projectId) {
                store.initialize(state.projectId);
              }
              break;
            }

            default: {
              logger.error(
                `Unhandled entity type in key configurator: ${context.entityType}`,
                {
                  action: 'initialize_configuration',
                  component: 'KeyConfiguratorStore',
                  projectId: state.projectId,
                },
              );
              return Promise.resolve(false);
            }
          }

          logger.info('Key configurator initialized successfully', {
            action: 'initialize_configuration',
            component: 'KeyConfiguratorStore',
            projectId: state.projectId,
          });
          return Promise.resolve(true);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          logger.error('Failed to initialize key configurator', {
            action: 'initialize_configuration',
            component: 'KeyConfiguratorStore',
            error: errorMessage,
            projectId: state.projectId,
          });
          return Promise.resolve(false);
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
        useSubsystemConfigStore.getState().reset();

        // Reset main store
        set({
          projectId: '',
          selectedItems: [],
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
