/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect} from 'react';

import {
  type ConfigurationContext,
  useKeyConfiguratorSelectionStore,
} from '~features/key-configurator/model';
import {ModuleConfigurationPanel} from '~features/key-configurator/module-configurator-view/ui';
import {SubgraphKeyVectorConfigPanel} from '~features/key-configurator/subgraph-configurator-view';
import {SubsystemConfigPanel} from '~features/key-configurator/subsystem-configurator-view';
import {logger} from '~shared/lib/logger';
import {
  type ConfigurationItem,
  ConfigurationItemType,
  ConfiguratorPanel,
  ConfiguratorUtils,
} from '~widgets/configurator-panel';

export const KeyConfiguratorPanel: React.FC = () => {
  // KeyConfigurator store - single source of truth for all state
  // Get the Zustand hook and use selectors to subscribe to specific state changes
  const useStore = useKeyConfiguratorSelectionStore();
  const selectedItems = useStore((state) => state.selectedItems);
  const projectId = useStore((state) => state.projectId);
  const isEditable = useStore((state) => state.isEditable);
  const setSelectedItems = useStore((state) => state.setSelectedItems);
  const initializeConfiguration = useStore(
    (state) => state.initializeConfiguration,
  );

  // Initialize configuration when selected items change
  useEffect(() => {
    if (!projectId || selectedItems.length === 0) {
      return;
    }

    // Initialize configuration for each selected item
    selectedItems.forEach((item) => {
      const context = mapItemToConfigurationContext(item);
      if (context) {
        initializeConfiguration(context);
        logger.debug('Configuration initialized for item', {
          action: 'initialize_configuration',
          component: 'KeyConfiguratorPanel',
        });
      }
    });
  }, [selectedItems, projectId, initializeConfiguration]);

  // Helper function to map ConfigurationItem to ConfigurationContext
  const mapItemToConfigurationContext = (
    item: ConfigurationItem,
  ): ConfigurationContext | null => {
    switch (item.type) {
      case ConfigurationItemType.MODULE:
        return {
          entityId: item.id,
          entityType: item.type,
          instanceId: item.instanceId,
          systemId: item.systemId,
        };

      case ConfigurationItemType.SUBGRAPH:
        return {
          entityId: item.id,
          entityType: item.type,
          systemId: item.systemId,
        };

      case ConfigurationItemType.SUBSYSTEM:
        return {
          entityId: item.id,
          entityType: item.type,
          systemId: item.systemId,
        };

      default:
        return null;
    }
  };

  // KeyConfigurator-specific rendering logic
  const renderKeyConfigView = (
    item: ConfigurationItem,
    isEditableParam: boolean,
  ) => {
    switch (item.type.toLowerCase()) {
      case 'subsystem':
        return (
          <SubsystemConfigPanel
            isEditable={isEditableParam}
            subsystemId={item.id}
          />
        );

      case 'subgraph':
        return (
          <SubgraphKeyVectorConfigPanel
            isEditable={isEditableParam}
            subgraphId={item.id}
          />
        );

      case 'module':
        return (
          <ModuleConfigurationPanel
            instanceId={(item as any).instanceId || 1}
            isEditable={isEditableParam}
            moduleId={item.id}
          />
        );

      default:
        return (
          <div
            className="p-4 text-center text-sm"
            style={{color: 'var(--color-text-neutral-tertiary)'}}
          >
            <div
              style={{
                color: 'var(--color-text-neutral-tertiary)',
                marginBottom: '0.5rem',
              }}
            >
              ❓
            </div>
            <div style={{color: 'var(--color-text-neutral-secondary)'}}>
              Unknown configuration type: {item.type}
            </div>
          </div>
        );
    }
  };

  const handleSelectionChange = (items: ConfigurationItem[]) => {
    // Update store directly - single source of truth
    setSelectedItems(items);
  };

  // const handleSave = async () => {
  //   try {
  //     const success = await saveConfiguration()
  //     if (success) {
  //       logger.info("All configurations saved successfully", {
  //         action: "save_all_configurations",
  //         component: "KeyConfiguratorPanel",
  //         projectId,
  //       })
  //     } else {
  //       logger.error("Failed to save configurations", {
  //         action: "save_all_configurations",
  //         component: "KeyConfiguratorPanel",
  //         projectId,
  //       })
  //     }
  //     return success
  //   } catch (error) {
  //     const errorMessage =
  //       error instanceof Error ? error.message : "Unknown error"
  //     logger.error("Error saving configurations", {
  //       action: "save_all_configurations",
  //       component: "KeyConfiguratorPanel",
  //       error: errorMessage,
  //       projectId,
  //     })
  //     return false
  //   }
  // }

  return (
    <ConfiguratorPanel
      isEditable={isEditable}
      onItemExpand={(itemId, expanded) => {
        logger.debug(`Item ${itemId} ${expanded ? 'expanded' : 'collapsed'}`, {
          action: 'item_expand',
          component: 'KeyConfiguratorPanel',
        });
      }}
      onItemRemove={(itemId) => {
        logger.debug(`Item ${itemId} removed`, {
          action: 'item_remove',
          component: 'KeyConfiguratorPanel',
        });
      }}
      onSelectionChange={handleSelectionChange}
      renderConfigurationView={renderKeyConfigView}
      selectedItems={selectedItems}
    />
  );
};

// Re-export utilities for convenience
export {ConfiguratorUtils};
