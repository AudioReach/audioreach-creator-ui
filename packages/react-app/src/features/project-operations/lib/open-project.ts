/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {openWorkspaceProject} from '~entities/project/api/projects-api';
import {logger} from '~shared/lib/logger';
import {useGlobalStore} from '~shared/store/global-store';
import {useSessionStore} from '~shared/store/use-session-store';

export async function openProject(
  acdbFile: File,
  workspaceFile: File,
  filePath: string,
  projectName?: string,
  projectDescription?: string,
): Promise<void> {
  const existing = useSessionStore
    .getState()
    .projectGroups.find((pg) => pg.filePath === filePath);

  if (existing) {
    useGlobalStore.getState().setActiveProject(existing.projectId);
    logger.debug('Project already open — switching to existing', {
      action: 'open_project',
      component: 'openProject',
      projectId: existing.projectId,
    });
    return;
  }

  const result = await openWorkspaceProject(
    acdbFile,
    workspaceFile,
    projectName,
    projectDescription,
  );

  if (!result.success || !result.data) {
    logger.error('Failed to open project via backend', {
      action: 'open_project',
      component: 'openProject',
      error: result.message,
    });
    throw new Error(result.message ?? 'Failed to open project');
  }

  const projectId = result.data.projectId;

  useSessionStore.getState().registerProjectGroup(projectId, filePath);
  useGlobalStore.getState().setActiveProject(projectId);
  useGlobalStore.getState().upsertRecentProject({
    filePath,
    lastOpenedAt: Date.now(),
    projectId,
    projectName: result.data.name ?? projectName ?? filePath,
  });

  logger.debug('Project opened', {
    action: 'open_project',
    component: 'openProject',
    projectId,
  });
}
