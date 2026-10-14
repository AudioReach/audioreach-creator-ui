/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the asynchronous source loader that supplies SGKV metadata calculation.
 * Membership is resolved by the selected subgraph so metadata never fans out
 * into a component query for every usecase in the project.
 */
jest.mock('~entities/usecases');

import {
  getAllUsecases,
  getUsecaseComponents,
} from '~entities/usecases';
import {loadSubgraphKvUsecaseSources} from '~features/key-configurator/subgraph-configurator-view/lib/load-subgraph-kv-usecase-sources';

const mockGetAllUsecases = jest.mocked(getAllUsecases);
const mockGetUsecaseComponents = jest.mocked(getUsecaseComponents);

describe('loadSubgraphKvUsecaseSources', () => {
  it('loads usecases filtered by the selected subgraph natural ID', async () => {
    mockGetAllUsecases.mockResolvedValue({
      data: [
        {
          keyValuePairs: [],
          systemId: 'usecase-1',
          usecaseType: 'LINKED',
        },
        {
          keyValuePairs: [],
          systemId: 'usecase-2',
          usecaseType: 'EC',
        },
      ],
    });

    await expect(
      loadSubgraphKvUsecaseSources('project-1', 42),
    ).resolves.toEqual([
      {
        keyValuePairs: [],
        systemId: 'usecase-1',
        usecaseType: 'LINKED',
      },
      {
        keyValuePairs: [],
        systemId: 'usecase-2',
        usecaseType: 'EC',
      },
    ]);
    expect(mockGetAllUsecases).toHaveBeenCalledWith(
      'project-1',
      'subgraphNaturalId:42',
    );
    expect(mockGetUsecaseComponents).not.toHaveBeenCalled();
  });

  it('returns null when the selected-subgraph lookup has blocking issues', async () => {
    mockGetAllUsecases.mockResolvedValue({
      issues: [{code: 'FAILED', message: 'failed', severity: 'ERROR'}],
    });

    await expect(
      loadSubgraphKvUsecaseSources('project-1', 42),
    ).resolves.toBeNull();
  });
});
