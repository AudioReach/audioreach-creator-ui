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
  createModuleOperations,
  type ModuleOperations,
} from '../lib/module-operations';
import {
  createSubgraphOperations,
  type SubgraphOperations,
} from '../lib/subgraph-operations';

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
  ModuleOperations &
  SubgraphListSlice &
  SubgraphHeaderSelectionSlice &
  SubgraphOperations &
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
    ...createSubsystemSlice(
      (partial) => set(partial as Partial<GraphDesignerStore>),
      get,
    ),
    ...createKeyConfigSlice((partial) =>
      set(partial as Partial<GraphDesignerStore>),
    ),
    ...createValidationResultSlice(set, get),
    ...createModuleListSlice(
      (partial) => set(partial as Partial<GraphDesignerStore>),
      get,
      projectId,
    ),
    ...createModuleDataSlice(set, get, projectId),
    ...createModuleOperations(set, projectId),
    ...createSubgraphListSlice(
      (partial) => set(partial as Partial<GraphDesignerStore>),
      get,
      projectId,
    ),
    ...createSubgraphHeaderSelectionSlice(set, get),
    ...createSubgraphOperations(set, projectId),
    ...createPropertiesViewSlice((partial) =>
      set(partial as Partial<GraphDesignerStore>),
    ),
    ...createPanelLayoutSlice((partial) =>
      set(partial as Partial<GraphDesignerStore>),
    ),
    ...createPanelTabRegistrySlice((partial) =>
      set(partial as Partial<GraphDesignerStore>),
    ),
    ...createSearchSlice((partial) =>
      set(partial as Partial<GraphDesignerStore>),
    ),

    // Seed usecase selection from global store on creation.
    selectedUsecases: initialSelectedUsecases,
  }));
}
