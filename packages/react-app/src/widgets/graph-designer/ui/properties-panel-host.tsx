/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback} from 'react';

import type {LevelView} from '~entities/graph';
import {
  useGraphDesignerStore,
  useGraphDesignerStoreShallow,
} from '~features/graph-designer';
import {withMutationLock} from '~features/graph-designer/model/edit-session-slice';
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
    isMutating: state.isMutating,
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
  const runMutation = useCallback(
    <T,>(action: () => Promise<T>): Promise<T> =>
      withMutationLock(store.getState, action),
    [store],
  );

  if (!props.graphData) {
    return null;
  }

  return (
    <PropertiesPanel
      graphData={props.graphData}
      isEditing={props.isEditing}
      isMutating={props.isMutating}
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
      runMutation={runMutation}
      selectedEdges={props.selectedEdges}
      selectedNodes={props.selectedNodes}
      virtualControlLinks={effectiveGraph?.proxyControlLinks ?? []}
      virtualDataLinks={effectiveGraph?.proxyDataLinks ?? []}
    />
  );
}
