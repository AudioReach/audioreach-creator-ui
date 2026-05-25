/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {TabType} from './global-store.types';
import type {ProjectStore} from './project-store.types';
import type {TabStoreRegistry} from './tab-store-registry';

type ProjectStoreApi = StoreApi<ProjectStore>;

export class ProjectStoreRegistry {
  private stores: Map<string, ProjectStoreApi> = new Map();

  register(projectId: string, store: ProjectStoreApi): void {
    this.stores.set(projectId, store);
    logger.debug('Project store registered', {
      action: 'register',
      component: 'ProjectStoreRegistry',
      projectId,
    });
  }

  get(projectId: string): ProjectStoreApi | undefined {
    return this.stores.get(projectId);
  }

  remove(projectId: string): void {
    this.stores.delete(projectId);
    logger.debug('Project store removed', {
      action: 'remove',
      component: 'ProjectStoreRegistry',
      projectId,
    });
  }

  has(projectId: string): boolean {
    return this.stores.has(projectId);
  }

  getAll(): Map<string, ProjectStoreApi> {
    return new Map(this.stores);
  }

  clear(): void {
    this.stores.clear();
  }

  getCount(): number {
    return this.stores.size;
  }

  openTab(
    projectId: string,
    tabType: TabType,
    title: string,
    tabRegistry: TabStoreRegistry,
  ): string {
    const projectStore = this.getOrThrow(projectId);
    const tabId = projectStore.getState().openTab(tabType, title);
    tabRegistry.createTabStore(tabId, tabType, projectId);
    return tabId;
  }

  private getOrThrow(projectId: string): ProjectStoreApi {
    const store = this.stores.get(projectId);
    if (!store) {
      throw new Error(`No project store registered for id: ${projectId}`);
    }
    return store;
  }
}

export const projectStoreRegistry = new ProjectStoreRegistry();
