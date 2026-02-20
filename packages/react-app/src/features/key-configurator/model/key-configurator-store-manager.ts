/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';
import {useProjectLayoutStore} from '~shared/store';

import {createKeyConfiguratorStore} from './key-configurator-store';

/**
 * Project-aware KeyConfigurator store manager
 * Creates and manages separate KeyConfigurator store instances for each project
 */
class KeyConfiguratorStoreManager {
  private stores = new Map<
    string, // projectId
    ReturnType<typeof createKeyConfiguratorStore>
  >();

  /**
   * Get or create a KeyConfigurator store for a specific project
   */
  getStore(projectId: string): ReturnType<typeof createKeyConfiguratorStore> {
    if (!this.stores.has(projectId)) {
      this.stores.set(projectId, createKeyConfiguratorStore(projectId));
      logger.info('KeyConfigurator store created for project', {
        action: 'create_store',
        component: 'KeyConfiguratorStoreManager',
        projectId,
      });
    }
    return this.stores.get(projectId)!;
  }

  /**
   * Get the store for the currently active project
   */
  getCurrentProjectStore(): ReturnType<
    typeof createKeyConfiguratorStore
  > | null {
    try {
      const state = useProjectLayoutStore.getState();
      const activeProjectGroup = state.getActiveProjectGroup();
      const projectId = activeProjectGroup?.id;

      if (!projectId) {
        return null;
      }

      return this.getStore(projectId);
    } catch (error) {
      logger.error('Failed to get current project store', {
        action: 'get_current_store',
        component: 'KeyConfiguratorStoreManager',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Remove store for a project (cleanup when project is closed)
   */
  removeProjectStore(projectId: string): void {
    this.stores.delete(projectId);
    logger.info('KeyConfigurator store removed for project', {
      action: 'remove_store',
      component: 'KeyConfiguratorStoreManager',
      projectId,
    });
  }

  /**
   * Clear all stores (cleanup on app shutdown)
   */
  clearAllStores(): void {
    this.stores.clear();
    logger.info('All KeyConfigurator stores cleared', {
      action: 'clear_all_stores',
      component: 'KeyConfiguratorStoreManager',
    });
  }
}

// Global instance
const keyConfiguratorStoreManager = new KeyConfiguratorStoreManager();

// Fallback store for when no project is active (created once and reused)
let fallbackStore: ReturnType<typeof createKeyConfiguratorStore> | null = null;

/**
 * Hook to get the KeyConfigurator store for the current project
 * Returns the Zustand hook that can be called with selectors
 */
export function useKeyConfiguratorSelectionStore(): ReturnType<
  typeof createKeyConfiguratorStore
> {
  const currentStore = keyConfiguratorStoreManager.getCurrentProjectStore();

  if (!currentStore) {
    // Fallback: create a temporary store if no project is active
    // Reuse the same fallback store instance to maintain state
    if (!fallbackStore) {
      fallbackStore = createKeyConfiguratorStore('temp');
      logger.info('Created fallback KeyConfigurator store', {
        action: 'create_fallback_store',
        component: 'KeyConfiguratorStoreManager',
      });
    }
    return fallbackStore;
  }

  return currentStore;
}

export {keyConfiguratorStoreManager};
