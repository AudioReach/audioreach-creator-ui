/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {ProjectStore} from './project-store.types';

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
}

export const projectStoreRegistry = new ProjectStoreRegistry();
