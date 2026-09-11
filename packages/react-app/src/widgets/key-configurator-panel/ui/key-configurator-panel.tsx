/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useState} from 'react';

import {
  type ConfigurationContext,
  type ConfigurationItem,
  ConfigurationItemType,
  useKeyConfiguratorSelectionStore,
} from '~features/key-configurator/model';
import {ModuleConfigurationPanel} from '~features/key-configurator/module-configurator-view/ui';
import {
  INITIAL_SUBGRAPH_KV_FILTER_STATE,
  SubgraphKeyVectorConfigPanel,
  type SubgraphKvFilterState,
} from '~features/key-configurator/subgraph-configurator-view';
import {SubsystemConfigPanel} from '~features/key-configurator/subsystem-configurator-view';
import {useGraphDesignerStoreShallow} from '~features/graph-designer';
import {useUserPreferences} from '~shared/config/hooks';
import {logger} from '~shared/lib/logger';
import {useProjectStoreShallow} from '~shared/store';
import {
  ConfiguratorPanel,
  ConfiguratorUtils,
} from '~widgets/configurator-panel';

/**
 * Connects Graph Designer selection to the existing Key Configurator host.
 * SGKV metadata is already refreshed by the always-mounted Graph Designer;
 * this tab only adapts the current View/Edit vectors into configuration UI.
 */
/** Hosts item configurators for selections supplied by Graph Designer. */
export const KeyConfiguratorPanel: React.FC = () => {
  const useStore = useKeyConfiguratorSelectionStore();
  const selectedItems = useStore((state) => state.selectedItems);
  const projectId = useStore((state) => state.projectId);
  const setSelectedItems = useStore((state) => state.setSelectedItems);
  const initializeConfiguration = useStore(
    (state) => state.initializeConfiguration,
  );
  const isEditable = useProjectStoreShallow(
    (state) => state.editModeState === 'edit',
  );
  const {preferences} = useUserPreferences();
  const [subgraphFilters, setSubgraphFilters] = useState<SubgraphKvFilterState>(
    INITIAL_SUBGRAPH_KV_FILTER_STATE,
  );
  const {
    addSgKvVector,
    availableGraphKeys,
    deleteSgKvVector,
    graphData,
    graphDataStatus,
    isSgKvMetadataRefreshing,
    kvSelectionsById,
    setSgKvVectorSelected,
  } = useGraphDesignerStoreShallow((state) => ({
    addSgKvVector: state.addSgKvVector,
    availableGraphKeys: state.availableGraphKeys,
    deleteSgKvVector: state.deleteSgKvVector,
    graphData: state.graphData,
    graphDataStatus: state.graphDataStatus,
    isSgKvMetadataRefreshing: state.isSgKvMetadataRefreshing,
    kvSelectionsById: state.kvSelectionsById,
    setSgKvVectorSelected: state.setSgKvVectorSelected,
  }));

  useEffect(() => {
    if (
      graphDataStatus !== 'ready' ||
      !projectId ||
      selectedItems.length === 0
    ) {
      return;
    }

    selectedItems.forEach((item) => {
      const context = mapItemToConfigurationContext(item);
      if (!context) {
        return;
      }

      void initializeConfiguration(context);
      logger.debug('Configuration initialized for item', {
        action: 'initialize_configuration',
        component: 'KeyConfiguratorPanel',
      });
    });
  }, [graphDataStatus, selectedItems, projectId, initializeConfiguration]);

  const displayMode =
    preferences.usecases.namePreference === 'keyvalues'
      ? 'key-value'
      : 'value-only';

  const renderKeyConfigView = (
    item: ConfigurationItem,
    isEditableParam: boolean,
  ) => {
    switch (item.type) {
      case ConfigurationItemType.SUBSYSTEM:
        return (
          <SubsystemConfigPanel
            isEditable={isEditableParam}
            subsystemId={item.id}
          />
        );

      case ConfigurationItemType.SUBGRAPH: {
        // Edit vectors are isolated so Apply serializes staged user choices.
        const vectors = isEditableParam
          ? (kvSelectionsById[item.systemId] ?? [])
          : (graphData?.subgraphs[item.systemId]?.kvVectors ?? []);

        return (
          <SubgraphKeyVectorConfigPanel
            availableGraphKeys={isEditableParam ? availableGraphKeys : null}
            displayMode={displayMode}
            filters={subgraphFilters}
            isEditable={isEditableParam}
            isMetadataPending={isSgKvMetadataRefreshing}
            onAdd={
              isEditableParam
                ? (keyValuePairs) => addSgKvVector(item.systemId, keyValuePairs)
                : undefined
            }
            onDelete={
              isEditableParam
                ? (vectorSystemId) =>
                    deleteSgKvVector(item.systemId, vectorSystemId)
                : undefined
            }
            onFiltersChange={setSubgraphFilters}
            onSelectionChange={
              isEditableParam
                ? (vectorSystemId, selected) =>
                    setSgKvVectorSelected(
                      item.systemId,
                      vectorSystemId,
                      selected,
                    )
                : undefined
            }
            subgraphSystemId={item.systemId}
            vectors={vectors}
          />
        );
      }

      case ConfigurationItemType.MODULE:
        return (
          <ModuleConfigurationPanel
            instanceId={item.id}
            isEditable={isEditableParam}
            moduleId={item.id}
          />
        );
    }
  };

  if (graphDataStatus === 'loading') {
    return (
      <div
        aria-live="polite"
        className="text-neutral-secondary flex h-full items-center justify-center p-4 text-sm"
        role="status"
      >
        Loading graph configuration...
      </div>
    );
  }

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
      onSelectionChange={setSelectedItems}
      renderConfigurationView={renderKeyConfigView}
      selectedItems={selectedItems}
    />
  );
};

function mapItemToConfigurationContext(
  item: ConfigurationItem,
): ConfigurationContext | null {
  switch (item.type) {
    case ConfigurationItemType.MODULE:
      return {
        entityId: item.id,
        entityType: item.type,
        moduleDefinitionSystemId: item.moduleDefinitionSystemId,
        systemId: item.systemId,
      };

    case ConfigurationItemType.SUBSYSTEM:
      return {
        entityId: item.id,
        entityType: item.type,
        systemId: item.systemId,
      };

    case ConfigurationItemType.SUBGRAPH:
      return null;
  }
}

export {ConfiguratorUtils};
