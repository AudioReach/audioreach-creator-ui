/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

import type {
  AppSlice,
  ProjectGroup,
  ProjectGroupSlice,
} from '../global-store.types';
import {projectStoreRegistry} from '../project-store-registry';

export function createProjectGroupSlice(
  set: (partial: Partial<ProjectGroupSlice>) => void,
  get: () => ProjectGroupSlice,
  getApp: () => AppSlice,
): ProjectGroupSlice {
  return {
    nextColorId: 1,

    openProjects: [],

    registerProjectGroup: (projectId: string, filePath: string): void => {
      const existing = get().openProjects.find(
        (pg) => pg.projectId === projectId,
      );
      if (existing) {
        return;
      }
      const assignedColorId = get().nextColorId;
      set({
        nextColorId: (assignedColorId % 20) + 1,
        openProjects: [
          ...get().openProjects,
          {colorId: assignedColorId, filePath, projectId},
        ],
      });
      logger.debug('Project group registered', {
        action: 'register_project_group',
        component: 'ProjectGroupSlice',
        projectId,
      });
    },

    removeProjectGroup: (projectId: string): void => {
      const wasActive = getApp().activeProjectId === projectId;

      projectStoreRegistry.get(projectId)?.getState().closeProject();
      projectStoreRegistry.remove(projectId);

      set({
        openProjects: get().openProjects.filter(
          (pg: ProjectGroup) => pg.projectId !== projectId,
        ),
      });

      if (wasActive) {
        const remaining = get().openProjects;
        const nextId =
          remaining.length > 0
            ? (remaining[remaining.length - 1]?.projectId ?? null)
            : null;
        getApp().setActiveProject(nextId);
      }

      logger.debug('Project group removed', {
        action: 'remove_project_group',
        component: 'ProjectGroupSlice',
        projectId,
      });
    },
  };
}
