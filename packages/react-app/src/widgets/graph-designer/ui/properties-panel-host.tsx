/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {LevelView} from '~entities/graph';
import {fetchSpfModuleProperties} from '~entities/spf-modules';
import {
  useGraphDesignerStore,
  useGraphDesignerStoreShallow,
} from '~features/graph-designer';
import {PropertiesPanel} from '~widgets/properties-panel';

interface PropertiesPanelHostProps {
  graph?: LevelView | null;
  projectId: string;
}

export function PropertiesPanelHost({
  graph,
  projectId,
}: PropertiesPanelHostProps) {
  const store = useGraphDesignerStore();
  const props = useGraphDesignerStoreShallow((state) => ({
    effectiveLevelView: state.effectiveLevelView,
    graphData: state.graphData,
    isEditing: state.mode === 'edit',
    requestNodeFocus: state.requestNodeFocus,
    selectedEdges: state.selectedEdges,
    selectedNodes: state.selectedNodes,
    updateContainerIdLocal: state.updateContainerIdLocal,
    updateModuleAliasLocal: state.updateModuleAliasLocal,
    updateModuleContainerLocal: state.updateModuleContainerLocal,
    updateModulePortCountLocal: state.updateModulePortCountLocal,
    updateSubgraphNameLocal: state.updateSubgraphNameLocal,
    updateSubsystemNameLocal: state.updateSubsystemNameLocal,
  }));
  const effectiveGraph = graph ?? props.effectiveLevelView;

  if (!props.graphData) {
    return null;
  }

  return (
    <PropertiesPanel
      graphData={props.graphData}
      isEditing={props.isEditing}
      onContainerHeapUpdated={(containerId) =>
        refreshContainerModuleProperties(
          projectId,
          props.graphData?.containers[containerId]?.moduleInstances ?? [],
        )
      }
      onContainerIdChange={props.updateContainerIdLocal}
      onModuleAliasChange={props.updateModuleAliasLocal}
      onModuleContainerChange={props.updateModuleContainerLocal}
      onModulePortCountChange={props.updateModulePortCountLocal}
      onNavigateToNode={props.requestNodeFocus}
      onSubgraphNameChange={props.updateSubgraphNameLocal}
      onSubsystemNameChange={props.updateSubsystemNameLocal}
      onVirtualControlLinkRowDelete={(connectionId) =>
        store.getState().excludeLink(store.getState, connectionId)
      }
      onVirtualDataLinkRowDelete={(connectionId) =>
        store.getState().excludeLink(store.getState, connectionId)
      }
      projectId={projectId}
      selectedEdges={props.selectedEdges}
      selectedNodes={props.selectedNodes}
      virtualControlLinks={effectiveGraph?.proxyControlLinks ?? []}
      virtualDataLinks={effectiveGraph?.proxyDataLinks ?? []}
    />
  );
}

async function refreshContainerModuleProperties(
  projectId: string,
  moduleIds: string[],
): Promise<void> {
  await Promise.allSettled(
    moduleIds.map((moduleId) => fetchSpfModuleProperties(projectId, moduleId)),
  );
}
