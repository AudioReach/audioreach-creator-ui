/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {TabType} from './global-store.types';

// ── Types ──────────────────────────────────────────────────────────────────

// Opaque tab store instance — concrete type added when tab stores are composed.
export type TabStoreInstance = StoreApi<Record<string, unknown>>;

type TabStoreFactory = (tabId: string, projectId: string) => TabStoreInstance;

// ── Registry ───────────────────────────────────────────────────────────────

export class TabStoreRegistry {
  private cleanups: Map<string, () => void> = new Map();
  private factories: Map<TabType, TabStoreFactory> = new Map();
  private stores: Map<string, TabStoreInstance> = new Map();

  registerFactory(tabType: TabType, factory: TabStoreFactory): void {
    this.factories.set(tabType, factory);
  }

  registerCleanup(tabId: string, fn: () => void): void {
    this.cleanups.set(tabId, fn);
  }

  /**
   * Returns the store for `tabId` cast to `StoreApi<T>`. The caller is
   * responsible for ensuring `T` matches the concrete type produced by the
   * factory registered under `tabType` — there is no runtime check.
   */
  createTabStore<T = Record<string, unknown>>(
    tabId: string,
    tabType: TabType,
    projectId: string,
  ): StoreApi<T> {
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

    return store as unknown as StoreApi<T>;
  }

  getTabStore(tabId: string): TabStoreInstance | undefined {
    return this.stores.get(tabId);
  }

  destroyTabStore(tabId: string): void {
    this.cleanups.get(tabId)?.();
    this.cleanups.delete(tabId);
    this.stores.delete(tabId);

    logger.debug('Tab store destroyed', {
      action: 'destroy_tab_store',
      component: 'TabStoreRegistry',
    });
  }

  destroyAllStores(): void {
    this.cleanups.forEach((fn) => fn());
    this.cleanups.clear();
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
