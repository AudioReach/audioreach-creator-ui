/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createContext, useContext} from 'react';

import type {StoreApi} from 'zustand';

import type {GraphDesignerStore} from './graph-designer-store';

export type GraphDesignerStoreApi = StoreApi<GraphDesignerStore>;

export const GraphDesignerStoreContext =
  createContext<GraphDesignerStoreApi | null>(null);
GraphDesignerStoreContext.displayName = 'GraphDesignerStoreContext';

export function useGraphDesignerStore(): GraphDesignerStoreApi {
  const store = useContext(GraphDesignerStoreContext);
  if (!store) {
    throw new Error(
      'useGraphDesignerStore must be used within a GraphDesignerStoreContext.Provider',
    );
  }
  return store;
}
