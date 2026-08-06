/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createStore, type StoreApi} from 'zustand';

import {useGlobalStore} from '~shared/store/global-store';
import {
  createPanelLayoutSlice,
  type PanelLayoutSlice,
} from '~shared/store/tab-store-slices/panel-layout-slice';
import {
  createPanelTabRegistrySlice,
  type PanelTabRegistrySlice,
} from '~shared/store/tab-store-slices/panel-tab-registry-slice';
import {
  createPropertiesViewSlice,
  type PropertiesViewSlice,
} from '~shared/store/tab-store-slices/properties-view-slice';
import {
  createSearchSlice,
  type SearchSlice,
} from '~shared/store/tab-store-slices/search-slice';
import {
  createSubsystemSlice,
  type SubsystemSlice,
} from '~shared/store/tab-store-slices/subsystem-slice';
import {
  createUsecaseSelectionSlice,
  type UsecaseSelectionSlice,
} from '~shared/store/tab-store-slices/usecase-selection-slice';
import {
  createValidationResultSlice,
  type ValidationResultSlice,
} from '~shared/store/tab-store-slices/validation-result-slice';

import {
  createEditSessionSlice,
  type EditSessionSlice,
} from './edit-session-slice';
import {createGraphDataSlice, type GraphDataSlice} from './graph-data-slice';
import {createKeyConfigSlice, type KeyConfigSlice} from './key-config-slice';
import {createModuleDataSlice, type ModuleDataSlice} from './module-data-slice';
import {createModuleListSlice, type ModuleListSlice} from './module-list-slice';
import {
  createSubgraphHeaderSelectionSlice,
  type SubgraphHeaderSelectionSlice,
} from './subgraph-header-selection-slice';
import {
  createSubgraphListSlice,
  type SubgraphListSlice,
} from './subgraph-list-slice';
import {createVisualizerSlice, type VisualizerSlice} from './visualizer-slice';

export type GraphDesignerStore = UsecaseSelectionSlice &
  GraphDataSlice &
  EditSessionSlice &
  VisualizerSlice &
  SubsystemSlice &
  KeyConfigSlice &
  ValidationResultSlice &
  ModuleListSlice &
  ModuleDataSlice &
  SubgraphListSlice &
  SubgraphHeaderSelectionSlice &
  PropertiesViewSlice &
  PanelLayoutSlice &
  PanelTabRegistrySlice &
  SearchSlice;

export function createGraphDesignerStore(
  _tabId: string,
  projectId: string,
): StoreApi<GraphDesignerStore> {
  const globalState = useGlobalStore.getState();
  const initialSelectedUsecases = globalState.selectedUsecaseIds;

  return createStore<GraphDesignerStore>((set, get) => ({
    ...createUsecaseSelectionSlice(set),
    ...createGraphDataSlice(set, get, projectId),
    ...createEditSessionSlice(set, get, projectId),
    ...createVisualizerSlice(set),
    ...createSubsystemSlice(set, get),
    ...createKeyConfigSlice(set),
    ...createValidationResultSlice(set, get),
    ...createModuleListSlice(set, get, projectId),
    ...createModuleDataSlice(set, get, projectId),
    ...createSubgraphListSlice(set, get, projectId),
    ...createSubgraphHeaderSelectionSlice(set, get),
    ...createPropertiesViewSlice(set),
    ...createPanelLayoutSlice(set),
    ...createPanelTabRegistrySlice(set),
    ...createSearchSlice(set),

    // Seed usecase selection from global store on creation.
    selectedUsecases: initialSelectedUsecases,
  }));
}
