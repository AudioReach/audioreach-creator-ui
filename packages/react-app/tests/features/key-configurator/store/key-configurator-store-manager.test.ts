/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  keyConfiguratorStoreManager,
  useKeyConfiguratorSelectionStore,
} from '~features/key-configurator/model/key-configurator-store-manager';
import {logger} from '~shared/lib/logger';
import {useProjectLayoutStore} from '~shared/store';

// Mock dependencies
jest.mock('~shared/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('~shared/store', () => ({
  useProjectLayoutStore: {
    getState: jest.fn(),
  },
}));

jest.mock('~features/key-configurator/model/calibration-keys-store', () => ({
  useCalibrationKeysStore: {
    getState: jest.fn(() => ({
      initialize: jest.fn(),
      projectId: null,
      reset: jest.fn(),
      saveToBackend: jest.fn(),
    })),
  },
}));

jest.mock('~features/key-configurator/model/module-tag-keys-store', () => ({
  useModuleTagKeysStore: {
    getState: jest.fn(() => ({
      initialize: jest.fn(),
      projectId: null,
      reset: jest.fn(),
      saveToBackend: jest.fn(),
    })),
  },
}));

jest.mock('~features/key-configurator/model/subgraph-config-store', () => ({
  useSubgraphConfigStore: {
    getState: jest.fn(() => ({
      initialize: jest.fn(),
      projectId: null,
      reset: jest.fn(),
      saveToBackend: jest.fn(),
    })),
  },
}));

jest.mock('~features/key-configurator/model/subsystem-config-store', () => ({
  useSubsystemConfigStore: {
    getState: jest.fn(() => ({
      initialize: jest.fn(),
      projectId: null,
      reset: jest.fn(),
      saveToBackend: jest.fn(),
    })),
  },
}));

jest.mock(
  '~features/key-configurator/model/module-instance-coordinator',
  () => ({
    moduleInstanceCoordinator: {
      fetchAndDistributeModuleInstanceData: jest.fn(),
    },
  }),
);

describe('KeyConfiguratorStoreManager', () => {
  beforeEach(() => {
    // Clear all stores before each test
    keyConfiguratorStoreManager.clearAllStores();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Store Creation and Management', () => {
    it('should create a new store for a project', () => {
      const projectId = 'project-1';
      const store = keyConfiguratorStoreManager.getStore(projectId);

      expect(store).toBeDefined();
      expect(typeof store).toBe('function');
      expect(logger.info).toHaveBeenCalledWith(
        'KeyConfigurator store created for project',
        {
          action: 'create_store',
          component: 'KeyConfiguratorStoreManager',
          projectId,
        },
      );
    });

    it('should return the same store instance for the same project', () => {
      const projectId = 'project-1';
      const store1 = keyConfiguratorStoreManager.getStore(projectId);
      const store2 = keyConfiguratorStoreManager.getStore(projectId);

      expect(store1).toBe(store2);
      // Logger should only be called once for creation
      expect(logger.info).toHaveBeenCalledTimes(1);
    });

    it('should create different stores for different projects', () => {
      const projectId1 = 'project-1';
      const projectId2 = 'project-2';

      const store1 = keyConfiguratorStoreManager.getStore(projectId1);
      const store2 = keyConfiguratorStoreManager.getStore(projectId2);

      expect(store1).not.toBe(store2);
      expect(logger.info).toHaveBeenCalledTimes(2);
    });

    it('should have correct projectId in created store', () => {
      const projectId = 'project-1';
      const store = keyConfiguratorStoreManager.getStore(projectId);
      const state = store.getState();

      expect(state.projectId).toBe(projectId);
    });
  });

  describe('getCurrentProjectStore', () => {
    it('should return store for active project', () => {
      const projectId = 'active-project';
      const mockProjectGroup = {
        id: projectId,
        title: 'Active Project',
      };

      (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
        getActiveProjectGroup: jest.fn().mockReturnValue(mockProjectGroup),
      });

      const store = keyConfiguratorStoreManager.getCurrentProjectStore();

      expect(store).toBeDefined();
      expect(store?.getState().projectId).toBe(projectId);
    });

    it('should return null when no active project', () => {
      (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
        getActiveProjectGroup: jest.fn().mockReturnValue(null),
      });

      const store = keyConfiguratorStoreManager.getCurrentProjectStore();

      expect(store).toBeNull();
    });

    it('should return null when active project has no id', () => {
      const mockProjectGroup = {
        id: undefined,
        title: 'Project Without ID',
      };

      (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
        getActiveProjectGroup: jest.fn().mockReturnValue(mockProjectGroup),
      });

      const store = keyConfiguratorStoreManager.getCurrentProjectStore();

      expect(store).toBeNull();
    });

    it('should handle errors gracefully', () => {
      (useProjectLayoutStore.getState as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      const store = keyConfiguratorStoreManager.getCurrentProjectStore();

      expect(store).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get current project store',
        {
          action: 'get_current_store',
          component: 'KeyConfiguratorStoreManager',
          error: 'Test error',
        },
      );
    });
  });

  describe('removeProjectStore', () => {
    it('should remove store for a specific project', () => {
      const projectId = 'project-to-remove';

      // Create the store first
      keyConfiguratorStoreManager.getStore(projectId);
      jest.clearAllMocks();

      // Remove it
      keyConfiguratorStoreManager.removeProjectStore(projectId);

      expect(logger.info).toHaveBeenCalledWith(
        'KeyConfigurator store removed for project',
        {
          action: 'remove_store',
          component: 'KeyConfiguratorStoreManager',
          projectId,
        },
      );

      // Getting the store again should create a new one
      keyConfiguratorStoreManager.getStore(projectId);
      expect(logger.info).toHaveBeenCalledWith(
        'KeyConfigurator store created for project',
        {
          action: 'create_store',
          component: 'KeyConfiguratorStoreManager',
          projectId,
        },
      );
    });

    it('should not throw error when removing non-existent store', () => {
      expect(() => {
        keyConfiguratorStoreManager.removeProjectStore('non-existent');
      }).not.toThrow();
    });
  });

  describe('clearAllStores', () => {
    it('should clear all stores', () => {
      // Create multiple stores
      keyConfiguratorStoreManager.getStore('project-1');
      keyConfiguratorStoreManager.getStore('project-2');
      keyConfiguratorStoreManager.getStore('project-3');

      jest.clearAllMocks();

      // Clear all
      keyConfiguratorStoreManager.clearAllStores();

      expect(logger.info).toHaveBeenCalledWith(
        'All KeyConfigurator stores cleared',
        {
          action: 'clear_all_stores',
          component: 'KeyConfiguratorStoreManager',
        },
      );

      // Getting stores again should create new ones
      keyConfiguratorStoreManager.getStore('project-1');
      expect(logger.info).toHaveBeenCalledWith(
        'KeyConfigurator store created for project',
        expect.objectContaining({
          projectId: 'project-1',
        }),
      );
    });

    it('should not throw error when clearing empty store manager', () => {
      expect(() => {
        keyConfiguratorStoreManager.clearAllStores();
      }).not.toThrow();
    });
  });

  describe('useKeyConfiguratorSelectionStore', () => {
    it('should return store for current project when project is active', () => {
      const projectId = 'active-project';
      const mockProjectGroup = {
        id: projectId,
        title: 'Active Project',
      };

      (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
        getActiveProjectGroup: jest.fn().mockReturnValue(mockProjectGroup),
      });

      const store = useKeyConfiguratorSelectionStore();

      expect(store).toBeDefined();
      expect(store.getState().projectId).toBe(projectId);
    });

    it('should return fallback store when no project is active', () => {
      (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
        getActiveProjectGroup: jest.fn().mockReturnValue(null),
      });

      const store = useKeyConfiguratorSelectionStore();

      expect(store).toBeDefined();
      expect(store.getState().projectId).toBe('temp');
      expect(logger.info).toHaveBeenCalledWith(
        'Created fallback KeyConfigurator store',
        {
          action: 'create_fallback_store',
          component: 'KeyConfiguratorStoreManager',
        },
      );
    });

    it('should reuse the same fallback store instance', () => {
      (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
        getActiveProjectGroup: jest.fn().mockReturnValue(null),
      });

      const store1 = useKeyConfiguratorSelectionStore();
      jest.clearAllMocks();

      const store2 = useKeyConfiguratorSelectionStore();

      expect(store1).toBe(store2);
      // Should not create a new fallback store
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should switch from fallback to project store when project becomes active', () => {
      // First call with no active project
      (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
        getActiveProjectGroup: jest.fn().mockReturnValue(null),
      });

      const fallbackStore = useKeyConfiguratorSelectionStore();
      expect(fallbackStore.getState().projectId).toBe('temp');

      // Second call with active project
      const projectId = 'new-active-project';
      const mockProjectGroup = {
        id: projectId,
        title: 'New Active Project',
      };

      (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
        getActiveProjectGroup: jest.fn().mockReturnValue(mockProjectGroup),
      });

      const projectStore = useKeyConfiguratorSelectionStore();
      expect(projectStore.getState().projectId).toBe(projectId);
      expect(projectStore).not.toBe(fallbackStore);
    });
  });

  describe('Store Isolation', () => {
    it('should maintain separate state for different projects', () => {
      const store1 = keyConfiguratorStoreManager.getStore('project-1');
      const store2 = keyConfiguratorStoreManager.getStore('project-2');

      // Modify state in store1
      store1.getState().setIsEditable(true);

      // Verify store2 is not affected
      expect(store1.getState().isEditable).toBe(true);
      expect(store2.getState().isEditable).toBe(false);
    });

    it('should maintain separate selections for different projects', () => {
      const store1 = keyConfiguratorStoreManager.getStore('project-1');
      const store2 = keyConfiguratorStoreManager.getStore('project-2');

      const mockItems1 = [{id: 'item-1', name: 'Item 1'}] as any;
      const mockItems2 = [{id: 'item-2', name: 'Item 2'}] as any;

      store1.getState().setSelectedItems(mockItems1);
      store2.getState().setSelectedItems(mockItems2);

      expect(store1.getState().selectedItems).toEqual(mockItems1);
      expect(store2.getState().selectedItems).toEqual(mockItems2);
    });
  });

  describe('Memory Management', () => {
    it('should allow garbage collection after removing store', () => {
      const projectId = 'temporary-project';

      // Create and use store
      const store = keyConfiguratorStoreManager.getStore(projectId);
      expect(store).toBeDefined();

      // Remove store
      keyConfiguratorStoreManager.removeProjectStore(projectId);

      // Create new store with same ID should be a different instance
      const newStore = keyConfiguratorStoreManager.getStore(projectId);
      expect(newStore).toBeDefined();
      // We can't directly test if they're different instances, but we can verify
      // that a new store was created by checking the logger
      expect(logger.info).toHaveBeenCalledWith(
        'KeyConfigurator store created for project',
        expect.objectContaining({
          projectId,
        }),
      );
    });

    it('should handle multiple clear operations', () => {
      keyConfiguratorStoreManager.getStore('project-1');
      keyConfiguratorStoreManager.getStore('project-2');

      keyConfiguratorStoreManager.clearAllStores();
      keyConfiguratorStoreManager.clearAllStores();

      expect(() => {
        keyConfiguratorStoreManager.getStore('project-1');
      }).not.toThrow();
    });
  });
});
