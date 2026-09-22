/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPost = jest.fn();

jest.mock('~shared/api', () => ({
  httpClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

import {putCalData, putTagData} from '~entities/spf-module-data';

const PROJECT_ID = 'proj-1';
const MODULE_ID = 'mod-1';
const CKV_SYSTEM_ID = 'ckv-1';
const TAG_SYSTEM_ID = 'tag-1';
const TKV_SYSTEM_ID = 'tkv-1';

describe('spf-module-api — putCalData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPut.mockResolvedValue({data: undefined, message: 'OK', success: true});
  });

  it('appends a param-system-ids query string when paramSystemIds is provided', async () => {
    await putCalData(PROJECT_ID, MODULE_ID, CKV_SYSTEM_ID, {parameters: []}, [
      'param-1',
      'param-2',
    ]);

    expect(mockPut).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/spf-modules/${MODULE_ID}/cal-data/${CKV_SYSTEM_ID}?param-system-ids=param-1,param-2`,
      {parameters: []},
      {retries: 0},
    );
  });

  it('omits the query string when paramSystemIds is not provided', async () => {
    await putCalData(PROJECT_ID, MODULE_ID, CKV_SYSTEM_ID, {parameters: []});

    expect(mockPut).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/spf-modules/${MODULE_ID}/cal-data/${CKV_SYSTEM_ID}`,
      {parameters: []},
      {retries: 0},
    );
  });

  it('omits the query string when paramSystemIds is an empty array', async () => {
    await putCalData(PROJECT_ID, MODULE_ID, CKV_SYSTEM_ID, {parameters: []}, []);

    expect(mockPut).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/spf-modules/${MODULE_ID}/cal-data/${CKV_SYSTEM_ID}`,
      {parameters: []},
      {retries: 0},
    );
  });
});

describe('spf-module-api — putTagData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPut.mockResolvedValue({data: undefined, message: 'OK', success: true});
  });

  it('PUTs Swagger parameters without an absent uiPersistence value', async () => {
    await putTagData(
      PROJECT_ID,
      MODULE_ID,
      TAG_SYSTEM_ID,
      TKV_SYSTEM_ID,
      {parameters: []},
    );

    expect(mockPut).toHaveBeenCalledWith(
      `/projects/${PROJECT_ID}/spf-modules/${MODULE_ID}/tag-data/${TAG_SYSTEM_ID}/${TKV_SYSTEM_ID}`,
      {parameters: []},
      {retries: 0},
    );
  });
});
