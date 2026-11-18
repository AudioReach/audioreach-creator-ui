/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~shared/api/electron-api', () => ({
  electronApi: {
    send: jest.fn(),
  },
}));
jest.mock('~entities/project/api/projects-api', () => ({
  openProject: jest.fn(),
  openWorkspaceProject: jest.fn(),
}));

import {openWorkspaceProject} from '~entities/project/api/projects-api';
import {SessionMode} from '~entities/project/model/session.dto';
import {ProjectService} from '~entities/project/services/project-service';
import {electronApi} from '~shared/api/electron-api';
import type {ApiIssue} from '~shared/api';

const mockOpenWorkspaceProject = jest.mocked(openWorkspaceProject);
const mockElectronSend = jest.mocked(electronApi.send);

function mockFilePickerSuccess(): void {
  mockElectronSend.mockResolvedValue({
    data: {
      acdbFileData: [65, 67, 68, 66],
      acdbFileName: 'project.acdb',
      cancelled: false,
      project: {
        description: 'Local description',
        filepath: '/tmp/project.awsp',
        name: 'Local project',
      },
      workspaceFileData: [80, 75, 3, 4],
    },
  });
}

describe('ProjectService.openWorkspaceProjectFromFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves backend issues on successful workspace open', async () => {
    mockFilePickerSuccess();
    const issues: ApiIssue[] = [
      {
        code: 'OPEN_WARN_001',
        message: 'Project opened with warning',
        severity: 'WARNING',
      },
    ];
    mockOpenWorkspaceProject.mockResolvedValue({
      data: {
        description: 'Backend description',
        name: 'Backend project',
        projectId: 'project-1',
        projectType: 'OFFLINE',
        sessionMode: SessionMode.Readonly,
      },
      issues,
    });

    const result = await ProjectService.openWorkspaceProjectFromFile();

    expect(result.success).toBe(true);
    expect(result.issues).toEqual(issues);
    expect(result.project).toMatchObject({
      description: 'Backend description',
      id: 'project-1',
      name: 'Backend project',
      sessionMode: SessionMode.Readonly,
    });
  });

  it('does not expose issues when workspace open is blocked', async () => {
    mockFilePickerSuccess();
    mockOpenWorkspaceProject.mockResolvedValue({
      issues: [
        {
          code: 'OPEN_BLOCKED',
          message: 'Cannot open project',
          severity: 'ERROR',
        },
      ],
    });

    const result = await ProjectService.openWorkspaceProjectFromFile();

    expect(result).toEqual({
      message: 'Cannot open project',
      success: false,
    });
  });
});
