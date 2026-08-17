/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {downloadProjectFiles} from '~entities/project/api/projects-api';
import * as httpClientModule from '~shared/api/http-client';

jest.mock('~shared/api/http-client', () => ({
  httpClient: {get: jest.fn()},
}));

/** Creates a File with arrayBuffer() polyfilled for jsdom */
function makeFile(bytes: number[], name: string): File {
  const file = new File([new Uint8Array(bytes)], name, {
    type: 'application/octet-stream',
  });
  // jsdom does not implement Blob.arrayBuffer() — polyfill it
  if (typeof (file as any).arrayBuffer !== 'function') {
    Object.defineProperty(file, 'arrayBuffer', {
      configurable: true,
      value: () => Promise.resolve(new Uint8Array(bytes).buffer),
    });
  }
  return file;
}

// Helper to build an ApiResult<FormData> envelope — mirrors what httpClient.get<FormData>() returns
// after processApiResponse parses the multipart response.
function buildMultipartResult(
  workspaceBytes: number[],
  workspaceName: string,
  acdbBytes?: number[],
  acdbName?: string,
): {data: FormData; message: string; success: boolean} {
  const workspaceFile = makeFile(workspaceBytes, workspaceName);
  const acdbFile = acdbBytes && acdbName ? makeFile(acdbBytes, acdbName) : null;

  const mockFormData = {
    get: (key: string) => {
      if (key === 'workspaceFile') {
        return workspaceFile;
      }
      if (key === 'acdbFile') {
        return acdbFile;
      }
      return null;
    },
  };

  return {
    data: mockFormData as unknown as FormData,
    message: '',
    success: true,
  };
}

describe('downloadProjectFiles', () => {
  let getMock: jest.Mock;

  beforeEach(() => {
    getMock = httpClientModule.httpClient.get as jest.Mock;
    jest.clearAllMocks();
  });

  // Both files extracted correctly when backend returns full multipart response
  it('returns workspaceFile and acdbFile when both present in multipart response', async () => {
    getMock.mockResolvedValue(
      buildMultipartResult(
        [80, 75, 3, 4], // PK ZIP header
        'project.awsp',
        [65, 67, 68, 66], // ACDB bytes
        'project.acdb',
      ),
    );

    const result = await downloadProjectFiles('test-project-id');

    expect(result).toMatchObject({success: true});
    expect(result.data?.workspaceFile.name).toBe('project.awsp');
    expect(result.data?.workspaceFile.content).toBeDefined();
    expect(result.data?.acdbFile?.name).toBe('project.acdb');
    expect(result.data?.acdbFile?.content).toBeDefined();
  });

  // Returns failure when ACDB file is missing from response (both files are mandatory)
  it('returns success: false when acdbFile is not present in response', async () => {
    getMock.mockResolvedValue(
      buildMultipartResult([80, 75, 3, 4], 'project.awsp'),
    );

    const result = await downloadProjectFiles('test-project-id');

    expect(result.success).toBe(false);
    expect(result.message).toContain('ACDB file not found');
  });

  // Returns failure with status text when backend returns HTTP error
  it('returns success: false when backend returns non-200 status', async () => {
    getMock.mockResolvedValue({
      message: 'HTTP error: 500 Internal Server Error',
      success: false,
    });

    const result = await downloadProjectFiles('test-project-id');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Internal Server Error');
    expect(result.data).toBeUndefined();
  });

  // Returns failure when multipart response is missing the required workspaceFile part
  it('returns success: false when workspaceFile is missing from response', async () => {
    const formData = new FormData();
    formData.append(
      'acdbFile',
      new File([new Uint8Array([1, 2, 3])], 'project.acdb', {
        type: 'application/octet-stream',
      }),
    );

    getMock.mockResolvedValue({data: formData, message: '', success: true});

    const result = await downloadProjectFiles('test-project-id');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Workspace file not found');
  });

  // Returns failure with error message when get() throws (network down, timeout)
  it('returns success: false on network error', async () => {
    getMock.mockRejectedValue(new Error('Network error'));

    const result = await downloadProjectFiles('test-project-id');

    expect(result.success).toBe(false);
    expect(result.message).toContain('Network error');
  });
});
