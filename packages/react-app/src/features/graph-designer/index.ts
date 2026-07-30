/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Register the graph-designer tab store factory with the global TabStoreRegistry.
// This must be imported before any graph-designer tab is opened.
import {
  type TabStoreInstance,
  tabStoreRegistry,
} from '~shared/store/tab-store-registry';

import {createGraphDesignerStore} from './model/graph-designer-store';
import {evictModuleListFilterCache} from './model/module-list-slice';
import {evictSubgraphListFilterCache} from './model/subgraph-list-slice';

tabStoreRegistry.registerFactory(
  'graph-designer',
  (tabId: string, projectId: string) => {
    tabStoreRegistry.registerCleanup(tabId, () => {
      evictModuleListFilterCache(projectId);
      evictSubgraphListFilterCache(projectId);
    });
    return createGraphDesignerStore(
      tabId,
      projectId,
    ) as unknown as TabStoreInstance;
  },
);

export {useApplyDiscard} from './hooks/use-apply-discard';
export {useGraphDesigner} from './hooks/use-graph-designer';
export {useKeyConfigurator} from './hooks/use-key-configurator';
export {useModuleList} from './hooks/use-module-list';
export {useSubgraphList} from './hooks/use-subgraph-list';
export {useSubsystemBrowser} from './hooks/use-subsystem-browser';
export {useValidationResults} from './hooks/use-validation-results';
export {
  GraphDesignerStoreContext,
  useGraphDesignerStore,
  useGraphDesignerStoreShallow,
} from './model/graph-designer-store-context';
export type {GraphDesignerStore} from './model/graph-designer-store';
export type {GraphDesignerStoreApi} from './model/graph-designer-store-context';
