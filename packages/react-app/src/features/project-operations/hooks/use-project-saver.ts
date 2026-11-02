/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useRef, useState} from 'react';

import {ApiRequest} from '@audioreach-creator-ui/api-utils';

import {commitChanges} from '~entities/edit-session';
import {downloadProjectFiles} from '~entities/project/api/projects-api';
import {electronApi, getIssueMessage, hasBlockingIssues} from '~shared/api';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import {useGlobalStore} from '~shared/store/global-store';

interface ProjectContent {
  acdbFileContent: Uint8Array;
  acdbFileName: string;
  workspaceFileContent: Uint8Array;
  workspaceFileName: string;
}

/**
 * Module-level helper: downloads project files from the backend and parses
 * the multipart response into separate workspace and acdb file content.
 * Path computation for secondary files (e.g. .acdb) is handled by Electron.
 */
async function fetchProjectContent(
  projectId: string,
): Promise<ProjectContent | null> {
  const result = await downloadProjectFiles(projectId);
  if (!result.success || !result.data) {
    showToast(result.message ?? 'Failed to download project', 'danger');
    return null;
  }

  return {
    acdbFileContent: new Uint8Array(result.data.acdbFile.content),
    acdbFileName: result.data.acdbFile.name,
    workspaceFileContent: new Uint8Array(result.data.workspaceFile.content),
    workspaceFileName: result.data.workspaceFile.name,
  };
}

/**
 * Fetch project content and send the write IPC request.
 * Returns success/error without showing toasts — callers decide how to handle.
 */
async function writeSavedFiles(
  projectId: string,
  filePath: string,
): Promise<{error?: string; success: boolean}> {
  if (!electronApi) {
    showToast('Electron API not available', 'danger');
    return {success: false};
  }

  // Calibration edits can be made outside edit mode and are only staged
  // until committed — commit here so Save/Save As/Save All persist them.
  const commitResult = await commitChanges(projectId);
  if (hasBlockingIssues(commitResult)) {
    return {
      error: getIssueMessage(commitResult, 'Failed to commit pending changes'),
      success: false,
    };
  }

  const files = await fetchProjectContent(projectId);
  if (!files) {
    return {success: false};
  }

  const projectFiles = [
    {
      fileContent: files.workspaceFileContent,
      fileName: files.workspaceFileName,
      filePath,
    },
    {
      fileContent: files.acdbFileContent,
      fileName: files.acdbFileName,
    },
  ];

  const response = await electronApi.send({
    data: {projectFiles},
    requestType: ApiRequest.SaveProjectFile,
  });

  if (response.data?.error) {
    return {error: response.data.error, success: false};
  }
  return {success: true};
}

/**
 * Hook for managing project save operations.
 * Provides saveProject (Save), saveProjectAs (Save As), and saveAllProjects (Save All).
 * Exposes isSaving state for the loading overlay.
 */
export function useProjectSaver() {
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  /** Sets both the state (for overlay rendering) and the ref (for re-entrancy guard) */
  const setSaving = (value: boolean) => {
    isSavingRef.current = value;
    setIsSaving(value);
  };

  /**
   * Save project to its current file path (Ctrl+S behaviour).
   * Shows loading overlay during operation.
   */
  const saveProject = useCallback(
    async (projectId: string, filePath: string) => {
      if (isSavingRef.current) {
        return;
      }
      try {
        setSaving(true);
        const result = await writeSavedFiles(projectId, filePath);
        if (!result.success) {
          if (result.error) {
            showToast(result.error, 'danger');
          }
          return;
        }
        showToast('Project saved successfully', 'success');
        logger.info('Project saved', {
          action: 'save_project',
          component: 'useProjectSaver',
          projectId,
        });
      } catch (error) {
        logger.error('Error saving project', {
          action: 'save_project',
          component: 'useProjectSaver',
          error: error instanceof Error ? error.message : String(error),
        });
        showToast('Failed to save project', 'danger');
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  /**
   * Save project to a user-selected path (Save As behaviour).
   * Shows OS dialog FIRST — loading overlay only appears after user confirms path.
   * Updates the stored file path on success so subsequent saves target the new location.
   */
  const saveProjectAs = useCallback(
    async (projectId: string, currentFilePath: string) => {
      if (isSavingRef.current) {
        return;
      }
      isSavingRef.current = true; // reserve before the async dialog to prevent double-dialog race
      if (!electronApi) {
        isSavingRef.current = false;
        showToast('Electron API not available', 'danger');
        return;
      }
      try {
        // Step 1: Show dialog first — electronApi checked above
        const pathResponse = await electronApi.send({
          data: {defaultPath: currentFilePath},
          requestType: ApiRequest.GetSaveAsProjectFilePath,
        });

        if (pathResponse.data?.error) {
          showToast(pathResponse.data.error, 'danger');
          return;
        }
        if (pathResponse.data?.cancelled) {
          return;
        }

        const newFilePath: string | undefined = pathResponse.data?.filePath;
        if (!newFilePath) {
          return;
        }

        // Step 2: Path confirmed — show overlay and write
        setSaving(true);
        const result = await writeSavedFiles(projectId, newFilePath);
        if (!result.success) {
          if (result.error) {
            showToast(result.error, 'danger');
          }
          return;
        }

        useGlobalStore.getState().updateProjectFilePath(projectId, newFilePath);
        showToast('Project saved successfully', 'success');
        logger.info(`Project saved as: ${newFilePath}`, {
          action: 'save_project_as',
          component: 'useProjectSaver',
          projectId,
        });
      } catch (error) {
        logger.error('Error saving project as', {
          action: 'save_project_as',
          component: 'useProjectSaver',
          error: error instanceof Error ? error.message : String(error),
        });
        showToast('Failed to save project', 'danger');
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  /**
   * Save all open projects sequentially (Save All behaviour).
   * Shows a single loading overlay for the entire operation.
   * Continues saving remaining projects even if one fails.
   */
  const saveAllProjects = useCallback(async () => {
    if (isSavingRef.current) {
      return;
    }
    const {openProjects} = useGlobalStore.getState();
    if (!openProjects.length) {
      return;
    }

    setSaving(true);
    const failed: string[] = [];

    try {
      for (const project of openProjects) {
        try {
          const result = await writeSavedFiles(
            project.projectId,
            project.filePath,
          );
          if (!result.success) {
            failed.push(project.filePath);
          }
        } catch {
          failed.push(project.filePath);
        }
      }

      if (failed.length > 0) {
        const count = failed.length;
        showToast(
          `Failed to save ${count} project${count > 1 ? 's' : ''}`,
          'danger',
        );
        logger.error('Save All partially failed', {
          action: 'save_all_projects',
          component: 'useProjectSaver',
          error: `Failed projects: ${failed.join(', ')}`,
        });
      } else {
        showToast('All projects saved successfully', 'success');
        logger.info('All projects saved', {
          action: 'save_all_projects',
          component: 'useProjectSaver',
        });
      }
    } finally {
      setSaving(false);
    }
  }, []);

  return {isSaving, saveAllProjects, saveProject, saveProjectAs};
}
