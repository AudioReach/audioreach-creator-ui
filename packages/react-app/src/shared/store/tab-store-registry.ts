/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {TabType} from './global-store.types';

// ── Types ──────────────────────────────────────────────────────────────────

// Opaque tab store instance — concrete type added when tab stores are composed.
type TabStoreInstance = StoreApi<Record<string, unknown>>;

type TabStoreFactory = (tabId: string, projectId: string) => TabStoreInstance;

// ── Registry ───────────────────────────────────────────────────────────────

export class TabStoreRegistry {
  private stores: Map<string, TabStoreInstance> = new Map();
  private factories: Map<TabType, TabStoreFactory> = new Map();

  registerFactory(tabType: TabType, factory: TabStoreFactory): void {
    this.factories.set(tabType, factory);
  }

  createTabStore(
    tabId: string,
    tabType: TabType,
    projectId: string,
  ): TabStoreInstance {
    const factory = this.factories.get(tabType);
    if (!factory) {
      throw new Error(`No factory registered for tab type: ${tabType}`);
    }

    const store = factory(tabId, projectId);
    this.stores.set(tabId, store);

    logger.debug('Tab store created', {
      action: 'create_tab_store',
      component: 'TabStoreRegistry',
    });

    return store;
  }

  getTabStore(tabId: string): TabStoreInstance | undefined {
    return this.stores.get(tabId);
  }

  destroyTabStore(tabId: string): void {
    this.stores.delete(tabId);

    logger.debug('Tab store destroyed', {
      action: 'destroy_tab_store',
      component: 'TabStoreRegistry',
    });
  }

  destroyAllStores(): void {
    this.stores.clear();
  }

  getStoreCount(): number {
    return this.stores.size;
  }
}

export function createTabStoreRegistry(): TabStoreRegistry {
  return new TabStoreRegistry();
}

export const tabStoreRegistry = new TabStoreRegistry();
