/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createRef, useCallback, useEffect, useRef} from 'react';

import type {LevelView} from '~entities/graph';
import {
  GraphDesignerStoreContext,
  useGraphDesignerStore,
  useGraphDesignerStoreShallow,
} from '~features/graph-designer';
import {withMutationLock} from '~features/graph-designer/model/edit-session-slice';
import {useProjectLayoutStore} from '~shared/store';
import {ConvertNumberToHexString} from '~shared/utils/converter-utils';
import {tabLayoutService} from '~widgets/project-layout/project-layout-manager';
import {PropertiesPanel} from '~widgets/properties-panel';
import {VcpmDataTab, type VcpmDataTabHandle} from '~widgets/vcpm-data-tab';

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
    markDirty: state.markDirty,
    moduleDefinitionsBySystemId: state.moduleDefinitionsBySystemId,
    requestNodeFocus: state.requestNodeFocus,
    selectedEdges: state.selectedEdges,
    selectedNodes: state.selectedNodes,
    updateContainerIdLocal: state.updateContainerIdLocal,
    updateModuleAliasLocal: state.updateModuleAliasLocal,
    updateModuleContainerLocal: state.updateModuleContainerLocal,
    updateModulePortCountLocal: state.updateModulePortCountLocal,
    updateSubgraphNameLocal: state.updateSubgraphNameLocal,
    updateSubsystemNameLocal: state.updateSubsystemNameLocal,
    vcpmOpenTabs: state.vcpmOpenTabs,
  }));
  const effectiveGraph = graph ?? props.effectiveLevelView;
  const runMutation = useCallback(
    <T,>(action: () => Promise<T>): Promise<T> =>
      withMutationLock(store.getState, action),
    [store],
  );

  const vcpmDataTabRefs = useRef(
    new Map<string, React.RefObject<VcpmDataTabHandle | null>>(),
  );
  const pendingVcpmOpensRef = useRef(new Set<string>());

  const forceCloseVcpmTab = useCallback(
    (subgraphId: string) => {
      const tabId = store.getState().vcpmOpenTabs[subgraphId];
      if (!tabId) {
        return;
      }
      vcpmDataTabRefs.current.delete(subgraphId);
      store.getState().setVcpmOpenTab(subgraphId, null);
      store.getState().clearVcpmData(subgraphId);
      useProjectLayoutStore.getState().removeProjectTab(projectId, tabId);
    },
    [projectId, store],
  );

  useEffect(() => {
    for (const subgraphId of Object.keys(props.vcpmOpenTabs)) {
      if (
        props.vcpmOpenTabs[subgraphId] &&
        !props.graphData?.subgraphs[subgraphId]
      ) {
        forceCloseVcpmTab(subgraphId);
      }
    }
  }, [forceCloseVcpmTab, props.graphData, props.vcpmOpenTabs]);

  const handleScenarioIdChanged = useCallback(
    (subgraphId: string, isVoiceCall: boolean) => {
      if (!isVoiceCall) {
        forceCloseVcpmTab(subgraphId);
      }
    },
    [forceCloseVcpmTab],
  );

  const handleOpenVcpmConfig = useCallback(
    async (subgraphId: string, subgraphName: string) => {
      const layout = useProjectLayoutStore.getState();
      const existingTabId = store.getState().vcpmOpenTabs[subgraphId];
      if (existingTabId) {
        layout.setActiveProjectTab(projectId, existingTabId);
        return;
      }
      if (pendingVcpmOpensRef.current.has(subgraphId)) {
        return;
      }
      pendingVcpmOpensRef.current.add(subgraphId);
      try {
        const ok = await store
          .getState()
          .queryVcpmData(subgraphId, subgraphName);
        if (!ok) {
          return;
        }
        const existingAfterFetch = store.getState().vcpmOpenTabs[subgraphId];
        if (existingAfterFetch) {
          layout.setActiveProjectTab(projectId, existingAfterFetch);
          return;
        }
        const vcpmDataTabRef = createRef<VcpmDataTabHandle>();
        vcpmDataTabRefs.current.set(subgraphId, vcpmDataTabRef);
        const naturalId =
          store.getState().graphData?.subgraphs[subgraphId]?.naturalId;
        const subgraphHexId =
          typeof naturalId === 'number'
            ? ConvertNumberToHexString(naturalId)
            : null;
        const tab = tabLayoutService.createProjectTab(
          `VCPM Configuration - Subgraph (${subgraphHexId ?? subgraphId})`,
          <GraphDesignerStoreContext.Provider value={store}>
            <VcpmDataTab ref={vcpmDataTabRef} subgraphSystemId={subgraphId} />
          </GraphDesignerStoreContext.Provider>,
          () => vcpmDataTabRef.current?.confirmClose() ?? true,
          () => {
            vcpmDataTabRefs.current.delete(subgraphId);
            store.getState().setVcpmOpenTab(subgraphId, null);
            store.getState().clearVcpmData(subgraphId);
          },
        );
        store.getState().setVcpmOpenTab(subgraphId, tab.id);
        layout.setActiveProjectTab(projectId, tab.id);
      } finally {
        pendingVcpmOpensRef.current.delete(subgraphId);
      }
    },
    [projectId, store],
  );

  if (!props.graphData) {
    return null;
  }

  return (
    <PropertiesPanel
      graphData={props.graphData}
      isEditing={props.isEditing}
      isMutating={props.isMutating}
      moduleDefinitionsBySystemId={props.moduleDefinitionsBySystemId}
      onContainerIdChange={props.updateContainerIdLocal}
      onModuleAliasChange={props.updateModuleAliasLocal}
      onModuleContainerChange={props.updateModuleContainerLocal}
      onModulePortCountChange={props.updateModulePortCountLocal}
      onNavigateToNode={props.requestNodeFocus}
      onOpenVcpmConfig={(subgraphId, subgraphName) =>
        void handleOpenVcpmConfig(subgraphId, subgraphName)
      }
      onScenarioIdChanged={handleScenarioIdChanged}
      onSchemaPropertyStaged={props.markDirty}
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
