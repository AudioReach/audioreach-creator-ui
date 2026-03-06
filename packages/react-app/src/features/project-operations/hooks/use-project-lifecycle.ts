/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useRef} from 'react';

import {ProjectImageService} from '~entities/project/services/project-image-service';
import {ConfigFileManager} from '~shared/config/config-manager';
import {logger} from '~shared/lib/logger';

import type {ProjectLifecycleHook} from '../model/types';

/**
 * Hook for managing project lifecycle events
 * Handles project close with screenshot capture
 */
export function useProjectLifecycle(): ProjectLifecycleHook {
  // Local screenshot registry - stores screenshot functions for each project
  const screenshotRegistryReference = useRef<
    Map<string, () => Promise<string | null>>
  >(new Map());

  /**
   * Handles project close - captures screenshot, saves config, and updates MRU
   * This runs BEFORE the project is removed, while GraphDesigner is still mounted
   */
  const handleProjectClose = async (
    projectId: string,
    projectName: string,
  ): Promise<boolean> => {
    logger.verbose(`Closing project: ${projectName}`, {
      action: 'close_project',
      component: 'useProjectLifecycle',
      projectId,
    });

    try {
      const screenshotFunction = screenshotRegistryReference.current.get(projectId);

      if (screenshotFunction) {
        // Capture screenshot BEFORE component unmounts
        await ProjectImageService.captureAndSave(projectId, screenshotFunction);
      }
    } catch (error) {
      logger.error('Failed to capture screenshot during project close', {
        action: 'close_project',
        component: 'useProjectLifecycle',
        error: error instanceof Error ? error.message : String(error),
        projectId,
      });
      // Don't block close on screenshot failure
    }

    // Save project configuration
    try {
      const saved =
        await ConfigFileManager.instance.archiveProjectConfig(projectId);
      if (!saved) {
        logger.warn('Failed to archive project configuration', {
          action: 'close_project',
          component: 'useProjectLifecycle',
          projectId,
        });
      }
    } catch (error) {
      logger.error('Failed to save project configuration during close', {
        action: 'close_project',
        component: 'useProjectLifecycle',
        error: error instanceof Error ? error.message : String(error),
        projectId,
      });
      // Don't block close on config save failure
    } finally {
      // Cleanup registry
      screenshotRegistryReference.current.delete(projectId);
    }

    // Allow close to proceed
    return true;
  };

  return {
    handleProjectClose,
    screenshotRegistry: screenshotRegistryReference.current,
  };
}
