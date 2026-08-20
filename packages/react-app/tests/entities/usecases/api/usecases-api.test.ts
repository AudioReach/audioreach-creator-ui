/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

import {
  getSubgraphContents,
  getSubgraphPairs,
  renameSubgraph,
} from '~entities/usecases/api/usecases-api';
import {httpClient} from '~shared/api/http-client';

const mockGet = jest.mocked(httpClient.get);
const mockPatch = jest.mocked(httpClient.patch);

describe('usecases-api — subgraph operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubgraphContents', () => {
    it('GETs the subgraph-scoped components endpoint', async () => {
      mockGet.mockResolvedValue({
        data: {controlLinks: [], dataLinks: [], spfModules: []},
        message: 'ok',
        success: true,
      });

      await getSubgraphContents('proj-1', 'sg-1');

      expect(mockGet).toHaveBeenCalledWith(
        '/projects/proj-1/subgraphs/sg-1/components',
      );
    });
  });

  describe('getSubgraphPairs', () => {
    it('GETs the subgraph-scoped subgraph-pairs endpoint', async () => {
      mockGet.mockResolvedValue({data: [], message: 'ok', success: true});

      await getSubgraphPairs('proj-1', 'sg-1');

      expect(mockGet).toHaveBeenCalledWith(
        '/projects/proj-1/subgraphs/sg-1/subgraph-pairs',
      );
    });
  });

  describe('renameSubgraph', () => {
    it('PATCHes the subgraph by systemId with the new name', async () => {
      mockPatch.mockResolvedValue({
        data: {
          id: 1,
          name: 'New Name',
          relatedEndPointLinks: [],
          SGKV: [],
          subGraphSharedType: '',
          systemId: 'sg-1',
        },
        message: 'ok',
        success: true,
      });

      await renameSubgraph('proj-1', 'sg-1', {name: 'New Name'});

      expect(mockPatch).toHaveBeenCalledWith(
        '/projects/proj-1/subgraphs/sg-1',
        {name: 'New Name'},
      );
    });
  });
});
