/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createStore, type StoreApi} from 'zustand';

import {useGlobalStore} from '~shared/store/global-store';
import {
  createGraphDataSlice,
  type GraphDataSlice,
} from '~shared/store/tab-store-slices/graph-data-slice';
import {
  createKeyConfigSlice,
  type KeyConfigSlice,
} from '~shared/store/tab-store-slices/key-config-slice';
import {
  createModuleListSlice,
  type ModuleListSlice,
} from '~shared/store/tab-store-slices/module-list-slice';
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
  createSubgraphListSlice,
  type SubgraphListSlice,
} from '~shared/store/tab-store-slices/subgraph-list-slice';
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
  createVisualizerSlice,
  type VisualizerSlice,
} from '~shared/store/tab-store-slices/visualizer-slice';

// ── Store type ──────────────────────────────────────────────────────────────

export type GraphDesignerStore = UsecaseSelectionSlice &
  GraphDataSlice &
  VisualizerSlice &
  SubsystemSlice &
  KeyConfigSlice &
  ValidationResultSlice &
  ModuleListSlice &
  SubgraphListSlice &
  PropertiesViewSlice &
  PanelLayoutSlice &
  PanelTabRegistrySlice;

// ── Factory ─────────────────────────────────────────────────────────────────

export function createGraphDesignerStore(
  _tabId: string,
  projectId: string,
): StoreApi<GraphDesignerStore> {
  const globalState = useGlobalStore.getState();
  const initialSelectedUsecases = globalState.selectedUsecaseIds;

  return createStore<GraphDesignerStore>((set, get) => ({
    ...createUsecaseSelectionSlice(set),
    ...createGraphDataSlice(set, projectId),
    ...createVisualizerSlice(set),
    ...createSubsystemSlice(set, get),
    ...createKeyConfigSlice(set, get),
    ...createValidationResultSlice(set, get),
    ...createModuleListSlice(set, get, projectId),
    ...createSubgraphListSlice(set, get, projectId),
    ...createPropertiesViewSlice(set),
    ...createPanelLayoutSlice(set),
    ...createPanelTabRegistrySlice(set),

    // Seed usecase selection from global store on creation.
    selectedUsecases: initialSelectedUsecases,
  }));
}
