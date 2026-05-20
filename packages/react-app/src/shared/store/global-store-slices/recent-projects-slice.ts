/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

import type {RecentProject, RecentProjectsSlice} from '../global-store.types';

export function createRecentProjectsSlice(
  set: (partial: Partial<RecentProjectsSlice>) => void,
  get: () => RecentProjectsSlice,
): RecentProjectsSlice {
  return {
    clearRecentProjects: () => {
      set({recentProjects: []});
      logger.debug('Recent projects cleared', {
        action: 'clear_recent_projects',
        component: 'RecentProjectsSlice',
      });
    },

    recentProjects: [],

    removeRecentProject: (projectId: string) => {
      const current = get().recentProjects;
      const updated = current.filter((p) => p.projectId !== projectId);
      set({recentProjects: updated});
      logger.debug('Recent project removed', {
        action: 'remove_recent_project',
        component: 'RecentProjectsSlice',
        projectId,
      });
    },

    upsertRecentProject: (project: RecentProject) => {
      const current = get().recentProjects;
      const existingIndex = current.findIndex(
        (p) => p.projectId === project.projectId,
      );

      let updated: RecentProject[];
      if (existingIndex !== -1) {
        updated = current.map((p) =>
          p.projectId === project.projectId
            ? {...p, lastOpenedAt: project.lastOpenedAt}
            : p,
        );
        updated.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
        logger.debug('Recent project updated and re-sorted', {
          action: 'upsert_recent_project',
          component: 'RecentProjectsSlice',
          projectId: project.projectId,
        });
      } else {
        updated = [project, ...current];
        logger.debug('Recent project added', {
          action: 'upsert_recent_project',
          component: 'RecentProjectsSlice',
          projectId: project.projectId,
        });
      }

      set({recentProjects: updated});
    },
  };
}
