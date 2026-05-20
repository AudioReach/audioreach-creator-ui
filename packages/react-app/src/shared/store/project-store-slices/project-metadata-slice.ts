/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

import type {SliceStatus} from '../global-store.types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface UsecaseMetadata {
  gkv: string;
  usecaseId: string;
  usecaseName: string;
}

export interface ProjectMetaDataSlice {
  loadMetadata: () => Promise<void>;
  metadataStatus: SliceStatus;
  projectDescription: string;
  projectName: string;
  projectVersion: string;

  usecases: UsecaseMetadata[];
}

// ── Slice creator ──────────────────────────────────────────────────────────

export function createProjectMetaDataSlice(
  set: (partial: Partial<ProjectMetaDataSlice>) => void,
  _get: () => ProjectMetaDataSlice,
): ProjectMetaDataSlice {
  return {
    loadMetadata: async () => {
      logger.debug('Loading project metadata', {
        action: 'load_metadata',
        component: 'ProjectMetaDataSlice',
      });

      set({metadataStatus: 'loading'});

      try {
        // TODO: Replace with actual backend API call:
        //   const data = await api.getAllUsecases(projectId);
        //   set({ usecases: data.usecases, projectName: data.projectName, ... });
        await Promise.resolve(); // placeholder for async backend call

        set({metadataStatus: 'ready'});

        logger.debug('Project metadata loaded successfully', {
          action: 'load_metadata',
          component: 'ProjectMetaDataSlice',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';

        logger.error('Failed to load project metadata', {
          action: 'load_metadata',
          component: 'ProjectMetaDataSlice',
          error: message,
        });

        set({metadataStatus: 'error'});
      }
    },
    metadataStatus: 'uninitialized',
    projectDescription: '',
    projectName: '',
    projectVersion: '',

    usecases: [],
  };
}
