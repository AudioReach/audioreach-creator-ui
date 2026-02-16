/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// Zustand slice type contracts for UsecaseVisualizer
// Actual implementation will be in shared/store when wiring
import type {GraphSpec, GraphView} from './usecase-visualizer.types';

export interface GraphSpecSliceState {
  graphSpec: GraphSpec;
}

export interface GraphSpecSliceActions {
  setComponentSpec: (spec: GraphSpec['componentSpec']) => void;
  setSimplifySubsystems: (value: boolean) => void;
  setSubgraphDisplayMode: (mode: GraphSpec['subgraphDisplayMode']) => void;
  setUsecases: (usecases: GraphSpec['includeUsecases']) => void;
}

export type GraphSpecSlice = GraphSpecSliceState & GraphSpecSliceActions;

export interface GraphDataSliceState {
  error?: string;
  loading: boolean;
  view: GraphView;
}

export interface GraphDataSliceActions {
  loadGraph: (spec: GraphSpec) => Promise<void>;
  setError: (msg?: string) => void;
  setLoading: (loading: boolean) => void;
  setView: (view: GraphView) => void;
}

export type GraphDataSlice = GraphDataSliceState & GraphDataSliceActions;
