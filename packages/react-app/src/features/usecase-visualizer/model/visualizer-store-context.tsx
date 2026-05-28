/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createContext, type ReactNode, useContext} from 'react';

import {useStore} from 'zustand';

import type {
  CreatedVisualizerStore,
  VisualizerInternalStore,
} from './usecase-visualizer-store';

/**
 * Per-mount Visualizer store context. Wraps the store created by
 * createVisualizerStore so node and edge components can subscribe via the
 * useVisualizerStore hook without prop-drilling. Internal to the feature.
 */
export const VisualizerStoreContext =
  createContext<CreatedVisualizerStore | null>(null);

interface VisualizerStoreProviderProps {
  children: ReactNode;
  store: CreatedVisualizerStore;
}

export function VisualizerStoreProvider({
  children,
  store,
}: VisualizerStoreProviderProps) {
  return (
    <VisualizerStoreContext.Provider value={store}>
      {children}
    </VisualizerStoreContext.Provider>
  );
}

export function useVisualizerStore<T>(
  selector: (state: VisualizerInternalStore) => T,
): T {
  const store = useContext(VisualizerStoreContext);
  if (!store) {
    throw new Error(
      'useVisualizerStore must be used within a VisualizerStoreProvider',
    );
  }
  return useStore(store, selector);
}
