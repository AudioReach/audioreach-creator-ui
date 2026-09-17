/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ProjectFilesDownload,
  ProjectInfoResponseDto,
} from '~entities/project/model/project.dto';
import type {ApiResult} from '~shared/api/api-response.types';
import {getIssueMessage, hasBlockingIssues} from '~shared/api/api-result-utils';
import {httpClient} from '~shared/api/http-client';

/**
 * Fetch all projects.
 * Returns ApiResult<Project[]> and does not throw; callers should inspect result.success.
 */
export async function getProjects(): Promise<
  ApiResult<ProjectInfoResponseDto[]>
> {
  return httpClient.get<ProjectInfoResponseDto[]>('/projects');
}

/**
 * Fetch a specific project by ID.
 * Returns ApiResult<Project> and does not throw; callers should inspect result.success.
 */
export async function getProjectById(
  projectId: string,
): Promise<ApiResult<ProjectInfoResponseDto>> {
  return httpClient.get<ProjectInfoResponseDto>(`/projects/${projectId}`);
}

/**
 * Open/connect to a project by ID.
 * Returns ApiResult<void> indicating success/failure.
 */
export async function openProject(projectId: string): Promise<ApiResult<void>> {
  return httpClient.patch<void>(`/projects/${projectId}/connect-to-project`);
}

/**
 * Close/disconnect a project by ID.
 * Returns ApiResult<void> indicating success/failure.
 */
export async function closeProject(
  projectId: string,
): Promise<ApiResult<void>> {
  return httpClient.patch<void>(
    `/projects/${projectId}/disconnect-from-project`,
  );
}

/**
 * Download all project files from the backend.
 * The backend returns multipart/form-data with two parts:
 *   - "workspaceFile" → the .awsp workspace file
 *   - "acdbFile"      → the .acdb binary file
 * processApiResponse detects the multipart content-type and returns FormData.
 */
export async function downloadProjectFiles(
  projectId: string,
): Promise<{data?: ProjectFilesDownload; message?: string; success: boolean}> {
  try {
    const result = await httpClient.get<FormData>(
      `/projects/${projectId}/download-files`,
    );
    if (hasBlockingIssues(result) || !result.data) {
      return {
        message: getIssueMessage(result, 'Failed to download project files'),
        success: false,
      };
    }

    const workspaceEntry = result.data.get('workspaceFile');
    const acdbEntry = result.data.get('acdbFile');

    if (!(workspaceEntry instanceof File)) {
      return {
        message: 'Workspace file not found in download response',
        success: false,
      };
    }

    if (!(acdbEntry instanceof File)) {
      return {
        message: 'ACDB file not found in download response',
        success: false,
      };
    }

    const workspaceContent = await workspaceEntry.arrayBuffer();

    return {
      data: {
        acdbFile: {
          content: await acdbEntry.arrayBuffer(),
          name: acdbEntry.name,
        },
        workspaceFile: {
          content: workspaceContent,
          name: workspaceEntry.name,
        },
      },
      success: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : String(error),
      success: false,
    };
  }
}

/**
 * Open a workspace project by uploading acdb and workspace files.
 * Returns ApiResult<ProjectInfoResponseDto> with the created project details.
 * @param acdbFile - The ACDB file to upload
 * @param workspaceFile - The workspace file to upload
 * @param projectName - Optional name for the project
 * @param projectDescription - Optional description for the project
 */
export async function openWorkspaceProject(
  acdbFile: File,
  workspaceFile: File,
  projectName?: string,
  projectDescription?: string,
): Promise<ApiResult<ProjectInfoResponseDto>> {
  // Create FormData for multipart/form-data request
  const formData = new FormData();
  formData.append('acdbFile', acdbFile);
  formData.append('workspaceFile', workspaceFile);

  if (projectName) {
    formData.append('projectName', projectName);
  }

  if (projectDescription) {
    formData.append('projectDescription', projectDescription);
  }

  return httpClient.post<ProjectInfoResponseDto>(
    'projects/offline/upload-files',
    formData,
  );
}
