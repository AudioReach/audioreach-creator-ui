/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';
import {readdir, readFile} from 'node:fs/promises';
import {basename, dirname, extname, join} from 'node:path';

import type {ProjectInfoResponseDto} from '../../../../react-app/src/entities/project/model/project.dto';
import type {CommandFactory} from '../../framework/command';
import type {OpenProjectFileResponse} from '../../framework/open-project-file';

export type OpenFileResult =
  | {readonly ok: true; readonly project: ProjectInfoResponseDto}
  | {readonly errors?: string[]; readonly message: string; readonly ok: false};

export type OpenFileInput = {
  readonly workspacePath: string;
};

type UploadResponse = {
  readonly data?: unknown;
  readonly errors?: string[];
  readonly message?: string;
  readonly success?: boolean;
};

function isUploadResponse(value: unknown): value is UploadResponse {
  return typeof value === 'object' && value !== null;
}

const projectTypes = ['DEVICE', 'OFFLINE'];
const sessionModes = [
  'DESIGNER',
  'DIFF_MERGE',
  'DISCOVERY_WIZARD',
  'READONLY',
  'TUNING',
];

function isProjectInfoResponseDto(
  value: unknown,
): value is ProjectInfoResponseDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const project = value as Record<string, unknown>;
  return (
    typeof project.description === 'string' &&
    typeof project.name === 'string' &&
    typeof project.projectId === 'string' &&
    projectTypes.includes(project.projectType as string) &&
    sessionModes.includes(project.sessionMode as string)
  );
}

export function parseUploadResponse(
  status: number,
  body: unknown,
): OpenFileResult {
  const uploadBody = isUploadResponse(body) ? body : undefined;
  const successful =
    status >= 200 && status < 300 && uploadBody?.success === true;

  if (!successful) {
    return {
      errors: uploadBody?.errors,
      message: uploadBody?.message ?? 'Failed to open project',
      ok: false,
    };
  }

  if (!isProjectInfoResponseDto(uploadBody.data)) {
    return {message: 'Invalid project response', ok: false};
  }

  return {ok: true, project: uploadBody.data};
}

export async function readFixture(
  workspacePath: string,
): Promise<OpenProjectFileResponse> {
  const acdbFileNames = (
    await readdir(dirname(workspacePath), {
      withFileTypes: true,
    })
  )
    .filter((entry) => entry.isFile() && extname(entry.name) === '.acdb')
    .map((entry) => entry.name)
    .sort();

  if (acdbFileNames.length === 0) {
    throw new Error(`No sibling .acdb file found for ${workspacePath}`);
  }
  if (acdbFileNames.length > 1) {
    throw new Error(
      `Multiple sibling .acdb files found for ${workspacePath}: ${acdbFileNames.join(', ')}`,
    );
  }

  const acdbFilePath = join(dirname(workspacePath), acdbFileNames[0]);
  const [workspaceFileData, acdbFileData] = await Promise.all([
    readFile(workspacePath),
    readFile(acdbFilePath),
  ]);
  const project = {
    description: '',
    filepath: workspacePath,
    name: '',
  };

  try {
    const jsonData = JSON.parse(workspaceFileData.toString('utf8')) as {
      description?: unknown;
      name?: unknown;
    };
    if (typeof jsonData.name === 'string' && jsonData.name) {
      project.name = jsonData.name;
    }
    if (typeof jsonData.description === 'string' && jsonData.description) {
      project.description = jsonData.description;
    }
  } catch {
    // Keep empty metadata when a fixture is not parseable JSON.
  }

  return {
    acdbFileData: new Uint8Array(acdbFileData),
    cancelled: false,
    project,
    workspaceFileData: new Uint8Array(workspaceFileData),
  };
}

export const openFile: CommandFactory<OpenFileInput, OpenFileResult> = (
  input,
) => ({
  execute: async (context) => {
    await context.ensureOpenProjectFileSeam(input.workspacePath, () =>
      readFixture(input.workspacePath),
    );
    const openProjectFileResponse = context.getOpenProjectFileResponse();
    if (!openProjectFileResponse) {
      throw new Error('OpenProjectFile seam response was not installed');
    }
    const hasUploadData =
      !openProjectFileResponse.cancelled &&
      openProjectFileResponse.acdbFileData &&
      openProjectFileResponse.project &&
      openProjectFileResponse.workspaceFileData;
    const responsePromise = hasUploadData
      ? context.page.waitForResponse((response) =>
          response.url().endsWith('/projects/offline/upload-files'),
        )
      : undefined;

    await context.pages.home.openFileButton.click();

    if (!responsePromise) {
      await expect(
        context.page.getByText('Opening file picker...'),
      ).not.toBeVisible();
      return {
        message: openProjectFileResponse.cancelled
          ? 'File selection cancelled'
          : 'Failed to read workspace file data',
        ok: false,
      };
    }

    const response = await responsePromise;
    const body: unknown = await response.json();
    const result = parseUploadResponse(response.status(), body);
    if (!result.ok) {
      return result;
    }

    await expect(
      context.page.getByText('Project opened successfully'),
    ).toBeVisible();
    return result;
  },
  id: 'home.open-file',
  metadata: {workspaceFile: basename(input.workspacePath)},
});
