/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useMemo, useState} from 'react';

import {
  selectConfiguredCkvs,
  selectConfiguredTkvs,
  useGraphDesignerStore,
  useGraphDesignerStoreShallow,
  withMutationLock,
} from '~features/graph-designer';
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
import type {ParamDefinitionsSummaryInfo} from '~entities/module-definitions/model/module-definition.dto';
import {useUserPreferences} from '~shared/config/hooks';
import {resolveKeyDisplayMode} from '~shared/lib/key-display-mode';
import {logger} from '~shared/lib/logger';
import {useProjectStoreShallow} from '~shared/store';
import type {
  ConfiguredCkv,
  ConfiguredTkv,
  Key,
} from '~shared/types/key-configurator-config.types';
import {
  ConfiguratorPanel,
  ConfiguratorUtils,
} from '~widgets/configurator-panel';

const NO_BACKEND_KEYS: Key[] = [];

interface ModuleConfigData {
  /** CKV key/value pairs already configured on this module instance. */
  configuredCkvs: ConfiguredCkv[];
  /** TKV key/value pairs already configured on this module instance. */
  configuredTkvs: ConfiguredTkv[];
  /**
   * Available parameter definitions from the module's definition (not the
   * instance) — used to populate CKV/TKV key selection.
   */
  paramDefinitionsSummaryInfo: ParamDefinitionsSummaryInfo[];
}

/**
 * Connects Graph Designer selection to the existing Key Configurator host.
 * SGKV metadata is already refreshed by the always-mounted Graph Designer;
 * this tab only adapts the current View/Edit vectors into configuration UI.
 */
/** Hosts item configurators for selections supplied by Graph Designer. */
export const KeyConfiguratorPanel: React.FC = () => {
  const graphStore = useGraphDesignerStore();
  const isMutating = useGraphDesignerStoreShallow((state) => state.isMutating);
  const runExclusive = <T,>(action: () => Promise<T>) =>
    withMutationLock(graphStore.getState, action);

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
    addCkvs,
    addSgKvVector,
    addTkvs,
    availableGraphKeys,
    calibrationKeys,
    deleteCkvs,
    deleteSgKvVector,
    deleteTagGroup,
    deleteTkvs,
    graphData,
    graphDataStatus,
    initializeConfiguration: initializeGraphDesignerConfiguration,
    isSgKvMetadataRefreshing,
    kvSelectionsById,
    moduleDefinitionsBySystemId,
    moduleTagKeys,
    setSgKvVectorSelected,
    updateCkvParametersOnly,
    updateConfiguredCkvs,
    updateTkvParameters,
  } = useGraphDesignerStoreShallow((state) => ({
    addCkvs: state.addCkvs,
    addSgKvVector: state.addSgKvVector,
    addTkvs: state.addTkvs,
    availableGraphKeys: state.availableGraphKeys,
    calibrationKeys: state.calibrationKeys,
    deleteCkvs: state.deleteCkvs,
    deleteSgKvVector: state.deleteSgKvVector,
    deleteTagGroup: state.deleteTagGroup,
    deleteTkvs: state.deleteTkvs,
    graphData: state.graphData,
    graphDataStatus: state.graphDataStatus,
    initializeConfiguration: state.initializeConfiguration,
    isSgKvMetadataRefreshing: state.isSgKvMetadataRefreshing,
    kvSelectionsById: state.kvSelectionsById,
    moduleDefinitionsBySystemId: state.moduleDefinitionsBySystemId,
    moduleTagKeys: state.moduleTagKeys,
    setSgKvVectorSelected: state.setSgKvVectorSelected,
    updateCkvParametersOnly: state.updateCkvParametersOnly,
    updateConfiguredCkvs: state.updateConfiguredCkvs,
    updateTkvParameters: state.updateTkvParameters,
  }));

  // Map each subsystem's backend filtered keys to the configurator's key format.
  const subsystems = graphData?.subsystems;
  const backendKeysBySubsystem = useMemo<Record<string, Key[]>>(() => {
    if (!subsystems) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(subsystems).map(([systemId, subsystem]) => [
        systemId,
        subsystem.filteredKeys?.map((key) => ({
          id: key.naturalId,
          name: key.name,
          systemId: key.systemId,
        })) ?? NO_BACKEND_KEYS,
      ]),
    );
  }, [subsystems]);

  // selectConfiguredCkvs/selectConfiguredTkvs re-derive fresh arrays on every
  // call, so per-instance results are memoized here rather than computed
  // inside the useGraphDesignerStoreShallow selector itself — doing so there
  // defeats useShallow's comparison (new array identity every render) and
  // triggers React's "getSnapshot should be cached" infinite-loop warning.
  const moduleConfigDataByInstance = useMemo(() => {
    const map: Record<string, ModuleConfigData> = {};
    selectedItems.forEach((item) => {
      if (item.type !== ConfigurationItemType.MODULE) {
        return;
      }
      const moduleDefinitionSystemId = item.moduleDefinitionSystemId;
      map[item.systemId] = {
        configuredCkvs: selectConfiguredCkvs(
          {calibrationKeys, graphData},
          item.systemId,
        ),
        configuredTkvs: selectConfiguredTkvs(
          {graphData, moduleTagKeys},
          item.systemId,
        ),
        paramDefinitionsSummaryInfo:
          moduleDefinitionsBySystemId[moduleDefinitionSystemId]
            ?.paramDefinitionsSummaryInfo ?? [],
      };
    });
    return map;
  }, [
    selectedItems,
    calibrationKeys,
    graphData,
    moduleTagKeys,
    moduleDefinitionsBySystemId,
  ]);

  useEffect(() => {
    if (
      graphDataStatus !== 'ready' ||
      !projectId ||
      selectedItems.length === 0
    ) {
      return;
    }

    selectedItems.forEach((item) => {
      const graphDesignerContext = mapItemToGraphDesignerConfigurationContext(
        item,
        projectId,
      );
      if (graphDesignerContext) {
        void initializeGraphDesignerConfiguration(graphDesignerContext);
      } else {
        const context = mapItemToConfigurationContext(item);
        if (!context) {
          return;
        }
        void initializeConfiguration(context);
      }

      logger.debug('Configuration initialized for item', {
        action: 'initialize_configuration',
        component: 'KeyConfiguratorPanel',
      });
    });
  }, [
    graphDataStatus,
    selectedItems,
    projectId,
    initializeConfiguration,
    initializeGraphDesignerConfiguration,
  ]);

  const displayMode = resolveKeyDisplayMode(
    preferences.usecases.namePreference,
  );

  const renderKeyConfigView = (
    item: ConfigurationItem,
    isEditableParam: boolean,
  ) => {
    switch (item.type) {
      case ConfigurationItemType.SUBSYSTEM:
        return (
          <SubsystemConfigPanel
            backendKeys={
              backendKeysBySubsystem[item.systemId] ?? NO_BACKEND_KEYS
            }
            isEditable={isEditableParam}
            isMutating={isMutating}
            projectId={projectId}
            runExclusive={runExclusive}
            subsystemId={item.id}
            subsystemSystemId={item.systemId}
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

      case ConfigurationItemType.MODULE: {
        const moduleConfigData = moduleConfigDataByInstance[item.systemId] ?? {
          configuredCkvs: [],
          configuredTkvs: [],
          paramDefinitionsSummaryInfo: [],
        };
        return (
          <ModuleConfigurationPanel
            addCkvs={addCkvs}
            addTkvs={addTkvs}
            calibrationKeys={calibrationKeys}
            configuredCkvs={moduleConfigData.configuredCkvs}
            configuredTkvs={moduleConfigData.configuredTkvs}
            deleteCkvs={deleteCkvs}
            deleteTagGroup={deleteTagGroup}
            deleteTkvs={deleteTkvs}
            instanceSystemId={item.systemId}
            isEditable={isEditableParam}
            moduleId={item.id}
            moduleTagKeys={moduleTagKeys}
            paramDefinitionsSummaryInfo={
              moduleConfigData.paramDefinitionsSummaryInfo
            }
            updateCkvParametersOnly={updateCkvParametersOnly}
            updateConfiguredCkvs={updateConfiguredCkvs}
            updateTkvParameters={updateTkvParameters}
          />
        );
      }
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
    case ConfigurationItemType.SUBSYSTEM:
      return {
        entityId: item.id,
        entityType: item.type,
        systemId: item.systemId,
      };

    case ConfigurationItemType.MODULE:
    case ConfigurationItemType.SUBGRAPH:
      return null;
  }
}

function mapItemToGraphDesignerConfigurationContext(
  item: ConfigurationItem,
  projectId: string,
): {itemId: string; itemType: 'module'; projectId: string} | null {
  if (item.type !== ConfigurationItemType.MODULE) {
    return null;
  }
  return {itemId: item.systemId, itemType: 'module', projectId};
}

export {ConfiguratorUtils};
