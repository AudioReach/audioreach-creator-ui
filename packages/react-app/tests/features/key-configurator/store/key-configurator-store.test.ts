/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Covers the existing module/subsystem configurator store without assigning it
 * SGKV ownership. The boundary matters because SGKV View/Edit data belongs to
 * Graph Data/Edit Session while this store continues to initialize CKV/TKV.
 */
import {ConfigurationItemType} from '~features/key-configurator/model';
import {
  createKeyConfiguratorStore,
  type ModuleConfigurationContext,
  type SubsystemConfigurationContext,
} from '~features/key-configurator/model/key-configurator-store';
import {useSubsystemConfigStore} from '~features/key-configurator/model/subsystem-config-store';
import {logger} from '~shared/lib/logger';

// Mock dependencies
jest.mock('~shared/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('~features/key-configurator/model/subsystem-config-store', () => ({
  useSubsystemConfigStore: {
    getState: jest.fn(),
  },
}));

describe('KeyConfiguratorStore', () => {
  let store: ReturnType<typeof createKeyConfiguratorStore>;
  const projectId = 'test-project-id';

  // Mock store states
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
    (useSubsystemConfigStore.getState as jest.Mock).mockReturnValue(
      mockSubsystemConfigStore,
    );

    // Reset mock store states
    mockSubsystemConfigStore.projectId = null;

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
      moduleDefinitionSystemId: 'module-definition-1',
      systemId: 'system-1',
    };

    it('does not handle MODULE items (moved to GraphDesignerStore)', async () => {
      const result = await store
        .getState()
        .initializeConfiguration(moduleContext);

      expect(result).toBe(false);
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
      mockSubsystemConfigStore.saveToBackend.mockResolvedValue(true);

      const result = await store.getState().saveConfiguration();

      expect(result).toBe(true);
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
      mockSubsystemConfigStore.saveToBackend.mockResolvedValue(false);

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
      mockSubsystemConfigStore.saveToBackend.mockRejectedValue(error);

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
      mockSubsystemConfigStore.saveToBackend.mockRejectedValue('String error');

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
