/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCalibrationKeysStore} from '~features/key-configurator/model/calibration-keys-store';
import {
  createKeyConfiguratorStore,
  type ModuleConfigurationContext,
  type SubgraphConfigurationContext,
  type SubsystemConfigurationContext,
} from '~features/key-configurator/model/key-configurator-store';
import {moduleInstanceCoordinator} from '~features/key-configurator/model/module-instance-coordinator';
import {useModuleTagKeysStore} from '~features/key-configurator/model/module-tag-keys-store';
import {useSubgraphConfigStore} from '~features/key-configurator/model/subgraph-config-store';
import {useSubsystemConfigStore} from '~features/key-configurator/model/subsystem-config-store';
import {logger} from '~shared/lib/logger';
import {ConfigurationItemType} from '~widgets/configurator-panel';

// Mock dependencies
jest.mock('~shared/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('~features/key-configurator/model/calibration-keys-store', () => ({
  useCalibrationKeysStore: {
    getState: jest.fn(),
  },
}));

jest.mock('~features/key-configurator/model/module-tag-keys-store', () => ({
  useModuleTagKeysStore: {
    getState: jest.fn(),
  },
}));

jest.mock('~features/key-configurator/model/subgraph-config-store', () => ({
  useSubgraphConfigStore: {
    getState: jest.fn(),
  },
}));

jest.mock('~features/key-configurator/model/subsystem-config-store', () => ({
  useSubsystemConfigStore: {
    getState: jest.fn(),
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

describe('KeyConfiguratorStore', () => {
  let store: ReturnType<typeof createKeyConfiguratorStore>;
  const projectId = 'test-project-id';

  // Mock store states
  const mockCalibrationKeysStore = {
    initialize: jest.fn(),
    projectId: null as string | null,
    reset: jest.fn(),
    saveToBackend: jest.fn(),
  };

  const mockModuleTagKeysStore = {
    initialize: jest.fn(),
    projectId: null as string | null,
    reset: jest.fn(),
    saveToBackend: jest.fn(),
  };

  const mockSubgraphConfigStore = {
    initialize: jest.fn(),
    projectId: null as string | null,
    reset: jest.fn(),
    saveToBackend: jest.fn(),
  };

  const mockSubsystemConfigStore = {
    initialize: jest.fn(),
    projectId: null as string | null,
    reset: jest.fn(),
    saveToBackend: jest.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock implementations
    (useCalibrationKeysStore.getState as jest.Mock).mockReturnValue(
      mockCalibrationKeysStore,
    );
    (useModuleTagKeysStore.getState as jest.Mock).mockReturnValue(
      mockModuleTagKeysStore,
    );
    (useSubgraphConfigStore.getState as jest.Mock).mockReturnValue(
      mockSubgraphConfigStore,
    );
    (useSubsystemConfigStore.getState as jest.Mock).mockReturnValue(
      mockSubsystemConfigStore,
    );

    // Reset mock store states
    mockCalibrationKeysStore.projectId = null;
    mockModuleTagKeysStore.projectId = null;
    mockSubgraphConfigStore.projectId = null;
    mockSubsystemConfigStore.projectId = null;

    mockCalibrationKeysStore.initialize.mockResolvedValue(true);
    mockModuleTagKeysStore.initialize.mockResolvedValue(true);
    mockSubgraphConfigStore.initialize.mockResolvedValue(true);
    (
      moduleInstanceCoordinator.fetchAndDistributeModuleInstanceData as jest.Mock
    ).mockResolvedValue({success: true});

    // Create a fresh store instance
    store = createKeyConfiguratorStore(projectId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState();

      expect(state.projectId).toBe(projectId);
      expect(state.selectedItems).toEqual([]);
      expect(state.isEditable).toBe(false);
    });

    it('should have all required methods', () => {
      const state = store.getState();

      expect(typeof state.initializeConfiguration).toBe('function');
      expect(typeof state.saveConfiguration).toBe('function');
      expect(typeof state.resetConfiguration).toBe('function');
      expect(typeof state.setSelectedItems).toBe('function');
      expect(typeof state.clearSelection).toBe('function');
      expect(typeof state.setIsEditable).toBe('function');
      expect(typeof state.toggleIsEditable).toBe('function');
    });
  });

  describe('Selection Management', () => {
    it('should set selected items', () => {
      const mockItems = [
        {id: 'item-1', name: 'Item 1'},
        {id: 'item-2', name: 'Item 2'},
      ] as any;

      store.getState().setSelectedItems(mockItems);

      const state = store.getState();
      expect(state.selectedItems).toEqual(mockItems);
      expect(logger.debug).toHaveBeenCalledWith('Selection updated: 2 items', {
        action: 'set_selected_items',
        component: 'KeyConfiguratorStore',
        projectId,
      });
    });

    it('should clear selection', () => {
      const mockItems = [{id: 'item-1', name: 'Item 1'}] as any;

      store.getState().setSelectedItems(mockItems);
      expect(store.getState().selectedItems).toHaveLength(1);

      store.getState().clearSelection();

      const state = store.getState();
      expect(state.selectedItems).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith('Selection cleared', {
        action: 'clear_selection',
        component: 'KeyConfiguratorStore',
        projectId,
      });
    });

    it('should handle empty selection', () => {
      store.getState().setSelectedItems([]);

      const state = store.getState();
      expect(state.selectedItems).toEqual([]);
    });
  });

  describe('Edit Mode Management', () => {
    it('should set editable mode to true', () => {
      store.getState().setIsEditable(false);
      expect(store.getState().isEditable).toBe(false);

      store.getState().setIsEditable(true);

      const state = store.getState();
      expect(state.isEditable).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith('Edit mode enabled', {
        action: 'set_is_editable',
        component: 'KeyConfiguratorStore',
        projectId,
      });
    });

    it('should set editable mode to false', () => {
      store.getState().setIsEditable(false);

      const state = store.getState();
      expect(state.isEditable).toBe(false);
      expect(logger.debug).toHaveBeenCalledWith('Edit mode disabled', {
        action: 'set_is_editable',
        component: 'KeyConfiguratorStore',
        projectId,
      });
    });

    it('should toggle editable mode from true to false', () => {
      store.getState().setIsEditable(true);
      expect(store.getState().isEditable).toBe(true);

      store.getState().toggleIsEditable();

      const state = store.getState();
      expect(state.isEditable).toBe(false);
      expect(logger.debug).toHaveBeenCalledWith(
        'Edit mode toggled to disabled',
        {
          action: 'toggle_is_editable',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
    });

    it('should toggle editable mode from false to true', () => {
      expect(store.getState().isEditable).toBe(false);

      store.getState().toggleIsEditable();

      const state = store.getState();
      expect(state.isEditable).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        'Edit mode toggled to enabled',
        {
          action: 'toggle_is_editable',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
    });
  });

  describe('Module Configuration Initialization', () => {
    const moduleContext: ModuleConfigurationContext = {
      entityId: 123,
      entityType: ConfigurationItemType.MODULE,
      instanceId: 456,
      systemId: 'system-1',
    };

    it('should initialize module configuration successfully', async () => {
      await store.getState().initializeConfiguration(moduleContext);

      expect(mockCalibrationKeysStore.initialize).toHaveBeenCalledWith(
        projectId,
      );
      expect(mockModuleTagKeysStore.initialize).toHaveBeenCalledWith(projectId);
      expect(
        moduleInstanceCoordinator.fetchAndDistributeModuleInstanceData,
      ).toHaveBeenCalledWith(
        projectId,
        moduleContext.entityId,
        moduleContext.instanceId,
        moduleContext.systemId,
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Key configurator initialized successfully',
        {
          action: 'initialize_configuration',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
    });

    it('should skip CKV initialization if already initialized', async () => {
      mockCalibrationKeysStore.projectId = projectId;

      await store.getState().initializeConfiguration(moduleContext);

      expect(mockCalibrationKeysStore.initialize).not.toHaveBeenCalled();
      expect(mockModuleTagKeysStore.initialize).toHaveBeenCalled();
    });

    it('should skip TKV initialization if already initialized', async () => {
      mockModuleTagKeysStore.projectId = projectId;

      await store.getState().initializeConfiguration(moduleContext);

      expect(mockCalibrationKeysStore.initialize).toHaveBeenCalled();
      expect(mockModuleTagKeysStore.initialize).not.toHaveBeenCalled();
    });

    it('should handle CKV initialization failure', async () => {
      mockCalibrationKeysStore.initialize.mockResolvedValue(false);

      await store.getState().initializeConfiguration(moduleContext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize calibration keys store',
        {
          action: 'initialize_configuration',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
      expect(
        moduleInstanceCoordinator.fetchAndDistributeModuleInstanceData,
      ).not.toHaveBeenCalled();
    });

    it('should handle TKV initialization failure', async () => {
      mockModuleTagKeysStore.initialize.mockResolvedValue(false);

      await store.getState().initializeConfiguration(moduleContext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize module tag keys store',
        {
          action: 'initialize_configuration',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
      expect(
        moduleInstanceCoordinator.fetchAndDistributeModuleInstanceData,
      ).not.toHaveBeenCalled();
    });

    it('should handle coordinator fetch failure', async () => {
      (
        moduleInstanceCoordinator.fetchAndDistributeModuleInstanceData as jest.Mock
      ).mockResolvedValue({
        error: 'Fetch failed',
        success: false,
      });

      await store.getState().initializeConfiguration(moduleContext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch module instance data via coordinator',
        {
          action: 'initialize_configuration',
          component: 'KeyConfiguratorStore',
          error: 'Fetch failed',
          projectId,
        },
      );
    });

    it('should handle exceptions during module initialization', async () => {
      const error = new Error('Unexpected error');
      mockCalibrationKeysStore.initialize.mockRejectedValue(error);

      await store.getState().initializeConfiguration(moduleContext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize key configurator',
        {
          action: 'initialize_configuration',
          component: 'KeyConfiguratorStore',
          error: 'Unexpected error',
          projectId,
        },
      );
    });
  });

  describe('Subgraph Configuration Initialization', () => {
    const subgraphContext: SubgraphConfigurationContext = {
      entityId: 789,
      entityType: ConfigurationItemType.SUBGRAPH,
      systemId: 'system-2',
    };

    it('should initialize subgraph configuration successfully', async () => {
      await store.getState().initializeConfiguration(subgraphContext);

      expect(mockSubgraphConfigStore.initialize).toHaveBeenCalledWith(
        projectId,
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Key configurator initialized successfully',
        {
          action: 'initialize_configuration',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
    });

    it('should skip subgraph initialization if already initialized', async () => {
      mockSubgraphConfigStore.projectId = projectId;

      await store.getState().initializeConfiguration(subgraphContext);

      expect(mockSubgraphConfigStore.initialize).not.toHaveBeenCalled();
    });

    it('should handle subgraph initialization failure', async () => {
      mockSubgraphConfigStore.initialize.mockResolvedValue(false);

      await store.getState().initializeConfiguration(subgraphContext);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize subgraph config store',
        {
          action: 'initialize_configuration',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
    });
  });

  describe('Subsystem Configuration Initialization', () => {
    const subsystemContext: SubsystemConfigurationContext = {
      entityId: 999,
      entityType: ConfigurationItemType.SUBSYSTEM,
      systemId: 'system-3',
    };

    it('should initialize subsystem configuration successfully', async () => {
      await store.getState().initializeConfiguration(subsystemContext);

      expect(mockSubsystemConfigStore.initialize).toHaveBeenCalledWith(
        projectId,
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Key configurator initialized successfully',
        {
          action: 'initialize_configuration',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
    });

    it('should skip subsystem initialization if already initialized', async () => {
      mockSubsystemConfigStore.projectId = projectId;

      await store.getState().initializeConfiguration(subsystemContext);

      expect(mockSubsystemConfigStore.initialize).not.toHaveBeenCalled();
    });
  });

  describe('Save Configuration', () => {
    it('should save all configurations successfully', async () => {
      mockCalibrationKeysStore.saveToBackend.mockResolvedValue(true);
      mockModuleTagKeysStore.saveToBackend.mockResolvedValue(true);
      mockSubgraphConfigStore.saveToBackend.mockResolvedValue(true);
      mockSubsystemConfigStore.saveToBackend.mockResolvedValue(true);

      const result = await store.getState().saveConfiguration();

      expect(result).toBe(true);
      expect(mockCalibrationKeysStore.saveToBackend).toHaveBeenCalled();
      expect(mockModuleTagKeysStore.saveToBackend).toHaveBeenCalled();
      expect(mockSubgraphConfigStore.saveToBackend).toHaveBeenCalled();
      expect(mockSubsystemConfigStore.saveToBackend).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'All configurations saved successfully',
        {
          action: 'save_all_configurations',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
    });

    it('should return false if any save fails', async () => {
      mockCalibrationKeysStore.saveToBackend.mockResolvedValue(true);
      mockModuleTagKeysStore.saveToBackend.mockResolvedValue(false);
      mockSubgraphConfigStore.saveToBackend.mockResolvedValue(true);
      mockSubsystemConfigStore.saveToBackend.mockResolvedValue(true);

      const result = await store.getState().saveConfiguration();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save some configurations',
        {
          action: 'save_all_configurations',
          component: 'KeyConfiguratorStore',
          projectId,
        },
      );
    });

    it('should handle save exceptions', async () => {
      const error = new Error('Save failed');
      mockCalibrationKeysStore.saveToBackend.mockRejectedValue(error);

      const result = await store.getState().saveConfiguration();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Error saving configurations', {
        action: 'save_all_configurations',
        component: 'KeyConfiguratorStore',
        error: 'Save failed',
        projectId,
      });
    });

    it('should handle non-Error exceptions during save', async () => {
      mockCalibrationKeysStore.saveToBackend.mockRejectedValue('String error');

      const result = await store.getState().saveConfiguration();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('Error saving configurations', {
        action: 'save_all_configurations',
        component: 'KeyConfiguratorStore',
        error: 'Unknown error',
        projectId,
      });
    });
  });

  describe('Reset Configuration', () => {
    it('should reset all configurations and clear selection', () => {
      // Set some state first
      store.getState().setSelectedItems([{id: 'item-1'}] as any);
      store.getState().setIsEditable(false);

      store.getState().resetConfiguration();

      const state = store.getState();
      expect(state.selectedItems).toEqual([]);
      expect(state.projectId).toBe('');
      expect(mockCalibrationKeysStore.reset).toHaveBeenCalled();
      expect(mockModuleTagKeysStore.reset).toHaveBeenCalled();
      expect(mockSubgraphConfigStore.reset).toHaveBeenCalled();
      expect(mockSubsystemConfigStore.reset).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Resetting all configurations', {
        action: 'reset_configuration',
        component: 'KeyConfiguratorStore',
      });
    });
  });

  describe('Store Subscriptions', () => {
    it('should support zustand subscriptions', () => {
      const listener = jest.fn();

      const unsubscribe = store.subscribe(
        (state) => state.selectedItems,
        listener,
      );

      store.getState().setSelectedItems([{id: 'item-1'}] as any);

      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });

    it('should support multiple subscriptions', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      const unsubscribe1 = store.subscribe(
        (state) => state.isEditable,
        listener1,
      );
      const unsubscribe2 = store.subscribe(
        (state) => state.selectedItems,
        listener2,
      );

      store.getState().toggleIsEditable();
      expect(listener1).toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();

      jest.clearAllMocks();

      store.getState().setSelectedItems([{id: 'item-1'}] as any);
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('Multiple Store Instances', () => {
    it('should create independent store instances', () => {
      const store1 = createKeyConfiguratorStore('project-1');
      const store2 = createKeyConfiguratorStore('project-2');

      store1.getState().setIsEditable(false);
      store2.getState().setIsEditable(true);

      expect(store1.getState().isEditable).toBe(false);
      expect(store2.getState().isEditable).toBe(true);
      expect(store1.getState().projectId).toBe('project-1');
      expect(store2.getState().projectId).toBe('project-2');
    });

    it('should maintain separate selections across instances', () => {
      const store1 = createKeyConfiguratorStore('project-1');
      const store2 = createKeyConfiguratorStore('project-2');

      const items1 = [{id: 'item-1'}] as any;
      const items2 = [{id: 'item-2'}] as any;

      store1.getState().setSelectedItems(items1);
      store2.getState().setSelectedItems(items2);

      expect(store1.getState().selectedItems).toEqual(items1);
      expect(store2.getState().selectedItems).toEqual(items2);
    });
  });
});
