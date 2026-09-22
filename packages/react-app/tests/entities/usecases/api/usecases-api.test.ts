/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/api/http-client', () => ({
  httpClient: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

import {
  createControlLink,
  createControlLinkWithSubsystems,
  createDataLink,
  createDataLinkWithSubsystems,
  getModulesBySystemIds,
  getSubgraphContents,
  getSubgraphPairs,
  getSubgraphsByIds,
  renameSubgraph,
} from '~entities/usecases/api/usecases-api';
import {httpClient} from '~shared/api/http-client';

const mockGet = jest.mocked(httpClient.get);
const mockPatch = jest.mocked(httpClient.patch);
const mockPost = jest.mocked(httpClient.post);

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

  describe('getSubgraphsByIds', () => {
    it('GETs the subgraphs endpoint without a query for empty system IDs', async () => {
      mockGet.mockResolvedValue({data: [], message: 'ok', success: true});

      await getSubgraphsByIds('proj-1', []);

      expect(mockGet).toHaveBeenCalledWith('/projects/proj-1/subgraphs');
    });

    it('GETs subgraphs using comma-separated system IDs', async () => {
      mockGet.mockResolvedValue({data: [], message: 'ok', success: true});

      await getSubgraphsByIds('proj-1', ['sg-1', 'sg-2']);

      expect(mockGet).toHaveBeenCalledWith(
        '/projects/proj-1/subgraphs?systemId=sg-1,sg-2',
      );
    });
  });

  describe('getModulesBySystemIds', () => {
    it('GETs the spf-modules endpoint without a query for empty system IDs', async () => {
      mockGet.mockResolvedValue({data: [], message: 'ok', success: true});

      await getModulesBySystemIds('proj-1', []);

      expect(mockGet).toHaveBeenCalledWith('/projects/proj-1/spf-modules');
    });

    it('GETs spf modules using comma-separated system IDs', async () => {
      mockGet.mockResolvedValue({data: [], message: 'ok', success: true});

      await getModulesBySystemIds('proj-1', ['mod-1', 'mod-2']);

      expect(mockGet).toHaveBeenCalledWith(
        '/projects/proj-1/spf-modules?systemId=mod-1,mod-2',
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

  describe('create links', () => {
    beforeEach(() => {
      mockPost.mockResolvedValue({
        data: {controlLinks: [], dataLinks: [], spfModules: []},
        message: 'ok',
        success: true,
      });
    });

    it('POSTs flat data links with module system IDs and linkType', async () => {
      await createDataLink('proj-1', {
        destinationModuleSystemId: 'mod-B',
        destinationPortSystemId: 'port-B',
        linkType: 'EC',
        sourceModuleSystemId: 'mod-A',
        sourcePortSystemId: 'port-A',
      });

      expect(mockPost).toHaveBeenCalledWith('/projects/proj-1/data-links', {
        destinationModuleSystemId: 'mod-B',
        destinationPortSystemId: 'port-B',
        linkType: 'EC',
        sourceModuleSystemId: 'mod-A',
        sourcePortSystemId: 'port-A',
      });
    });

    it('POSTs subsystem data links with node system IDs and linkType', async () => {
      await createDataLinkWithSubsystems('proj-1', {
        destinationNodeSystemId: 'mod-B',
        destinationPortSystemId: 'port-B',
        linkType: 'NORMAL',
        sourceNodeSystemId: 'ss-A',
        sourcePortSystemId: 'port-A',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/projects/proj-1/data-links/with-subsystems',
        {
          destinationNodeSystemId: 'mod-B',
          destinationPortSystemId: 'port-B',
          linkType: 'NORMAL',
          sourceNodeSystemId: 'ss-A',
          sourcePortSystemId: 'port-A',
        },
      );
    });

    it('POSTs control links with linkType', async () => {
      await createControlLink('proj-1', {
        endComponentSystemId: 'mod-B',
        endPortSystemId: 'port-B',
        linkType: 'INTER_USECASE',
        startComponentSystemId: 'mod-A',
        startPortSystemId: 'port-A',
      });

      expect(mockPost).toHaveBeenCalledWith('/projects/proj-1/control-links', {
        endComponentSystemId: 'mod-B',
        endPortSystemId: 'port-B',
        linkType: 'INTER_USECASE',
        startComponentSystemId: 'mod-A',
        startPortSystemId: 'port-A',
      });
    });

    it('POSTs subsystem control links with linkType', async () => {
      await createControlLinkWithSubsystems('proj-1', {
        endComponentSystemId: 'mod-B',
        endPortSystemId: 'port-B',
        linkType: 'NORMAL',
        startComponentSystemId: 'ss-A',
        startPortSystemId: 'port-A',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/projects/proj-1/control-links/with-subsystems',
        {
          endComponentSystemId: 'mod-B',
          endPortSystemId: 'port-B',
          linkType: 'NORMAL',
          startComponentSystemId: 'ss-A',
          startPortSystemId: 'port-A',
        },
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
