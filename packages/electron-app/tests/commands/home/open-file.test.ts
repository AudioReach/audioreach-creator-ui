/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect, test} from '@playwright/test';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {getTestData} from '../../framework/fixtures';
import type {TestContext} from '../../framework/test-context';
import {openFile, parseUploadResponse, readFixture} from './open-file';

test('openFile has the public command id and typed input contract', () => {
  const command = openFile({
    workspacePath: getTestData({}).validOpenProjectPath,
  });

  expect(command.id).toBe('home.open-file');
  expect(command.execute).toEqual(expect.any(Function));
});

test('readFixture reads metadata and bytes from the supplied fixture', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'open-file-fixture-'));
  const workspacePath = join(directory, 'fixture.awsp');
  const workspaceFileData = Buffer.from(
    JSON.stringify({description: 'Fixture description', name: 'Fixture name'}),
  );
  const acdbFileData = Buffer.from('calibration');

  try {
    await writeFile(workspacePath, workspaceFileData);
    await writeFile(join(directory, 'fixture.acdb'), acdbFileData);

    const result = await readFixture(workspacePath);

    expect(result.cancelled).toBe(false);
    expect(result.project).toEqual({
      description: 'Fixture description',
      filepath: workspacePath,
      name: 'Fixture name',
    });
    expect(result.workspaceFileData).toEqual(new Uint8Array(workspaceFileData));
    expect(result.acdbFileData).toEqual(new Uint8Array(acdbFileData));
  } finally {
    await rm(directory, {force: true, recursive: true});
  }
});

test('readFixture falls back to empty metadata for malformed workspace JSON', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'open-file-fixture-'));
  const workspacePath = join(directory, 'fixture.awsp');

  try {
    await writeFile(workspacePath, '{malformed');
    await writeFile(join(directory, 'fixture.acdb'), 'calibration');

    const result = await readFixture(workspacePath);

    expect(result.project).toEqual({
      description: '',
      filepath: workspacePath,
      name: '',
    });
  } finally {
    await rm(directory, {force: true, recursive: true});
  }
});

test('readFixture rejects multiple sibling acdb files clearly', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'open-file-fixture-'));
  const workspacePath = join(directory, 'workspaceFileXml.awsp');

  try {
    await writeFile(workspacePath, '{}');
    await writeFile(join(directory, 'acdb_cal.acdb'), 'calibration');
    await writeFile(join(directory, 'second.acdb'), 'calibration');

    await expect(readFixture(workspacePath)).rejects.toThrow(
      'Multiple sibling .acdb files found for',
    );
  } finally {
    await rm(directory, {force: true, recursive: true});
  }
});

test('openFile lets an explicit seam bypass fixture loading', async ({page}) => {
  await page.setContent('<button>Open File</button>');
  const response = {cancelled: true} as const;
  const context = {
    ensureOpenProjectFileSeam: (
      _workspacePath: string,
      _factory: () => Promise<unknown>,
    ) => Promise.resolve(),
    getOpenProjectFileResponse: () => response,
    hasOpenProjectFileSeam: () => true,
    page,
    pages: {home: {openFileButton: page.getByRole('button', {name: 'Open File'})}},
  } as unknown as TestContext;

  const result = await openFile({workspacePath: '/missing/workspace.awsp'}).execute(
    context,
  );

  expect(result).toEqual({message: 'File selection cancelled', ok: false});
});

test('parses a successful 2xx upload with the DTO project boundary', () => {
  const result = parseUploadResponse(201, {
    data: {
      description: 'Fixture project',
      name: 'Fixture project',
      projectId: 'project-1',
      projectType: 'OFFLINE',
      sessionMode: 'DESIGNER',
    },
    success: true,
  });

  expect(result).toEqual({
    ok: true,
    project: {
      description: 'Fixture project',
      name: 'Fixture project',
      projectId: 'project-1',
      projectType: 'OFFLINE',
      sessionMode: 'DESIGNER',
    },
  });
});

test('parses a 2xx response with body success false as rejection', () => {
  expect(
    parseUploadResponse(200, {
      errors: ['invalid workspace'],
      message: 'Upload rejected',
      success: false,
    }),
  ).toEqual({
    errors: ['invalid workspace'],
    message: 'Upload rejected',
    ok: false,
  });
});

test('parses a non-2xx response with body success true as rejection', () => {
  expect(
    parseUploadResponse(400, {
      data: {
        description: 'Fixture project',
        name: 'Fixture project',
        projectId: 'project-1',
        projectType: 'OFFLINE',
        sessionMode: 'DESIGNER',
      },
      success: true,
    }),
  ).toEqual({
    message: 'Failed to open project',
    ok: false,
  });
});

test('rejects a success body with incomplete project data', () => {
  expect(
    parseUploadResponse(200, {
      data: {
        description: 'Fixture project',
        name: 'Fixture project',
        projectId: 'project-1',
        projectType: 'OFFLINE',
      },
      success: true,
    }),
  ).toEqual({
    message: 'Invalid project response',
    ok: false,
  });
});

test('rejects a success body with invalid project field types', () => {
  expect(
    parseUploadResponse(200, {
      data: {
        description: 'Fixture project',
        name: 'Fixture project',
        projectId: 'project-1',
        projectType: 'OFFLINE',
        sessionMode: 'INVALID',
      },
      success: true,
    }),
  ).toEqual({
    message: 'Invalid project response',
    ok: false,
  });
});

test('rejects a malformed upload body', () => {
  expect(parseUploadResponse(200, null)).toEqual({
    message: 'Failed to open project',
    ok: false,
  });
});
