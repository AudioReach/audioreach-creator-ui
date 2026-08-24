/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/api/http-client', () => ({
  httpClient: {
    delete: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

import {
  createSubsystem,
  deleteSubsystem,
  moveSubsystemComponents,
  patchSubsystem,
} from '~entities/subsystems/api/subsystems-api';
import {httpClient} from '~shared/api/http-client';

const mockDelete = jest.mocked(httpClient.delete);
const mockPatch = jest.mocked(httpClient.patch);
const mockPost = jest.mocked(httpClient.post);

describe('subsystems-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubsystem', () => {
    it('POSTs to the project-scoped subsystems endpoint with the request body', async () => {
      mockPost.mockResolvedValue({
        data: undefined,
        message: 'ok',
        success: true,
      });

      await createSubsystem('proj-1', {name: 'New Subsystem'});

      expect(mockPost).toHaveBeenCalledWith('/projects/proj-1/subsystems', {
        name: 'New Subsystem',
      });
    });
  });

  describe('deleteSubsystem', () => {
    it('DELETEs the subsystem by systemId under the project scope', async () => {
      mockDelete.mockResolvedValue({
        data: undefined,
        message: 'ok',
        success: true,
      });

      await deleteSubsystem('proj-1', 'ss-1');

      expect(mockDelete).toHaveBeenCalledWith(
        '/projects/proj-1/subsystems/ss-1',
      );
    });
  });

  describe('moveSubsystemComponents', () => {
    it('POSTs moved component ids and target subsystem to the move endpoint', async () => {
      mockPost.mockResolvedValue({
        data: undefined,
        message: 'ok',
        success: true,
      });

      await moveSubsystemComponents('proj-1', {
        subgraphSystemIds: ['sg-1'],
        targetSubsystemSystemId: 'ss-1',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/projects/proj-1/subsystems/components/move',
        {subgraphSystemIds: ['sg-1'], targetSubsystemSystemId: 'ss-1'},
      );
    });

    it('POSTs targetSubsystemSystemId null when moving to root', async () => {
      mockPost.mockResolvedValue({
        data: undefined,
        message: 'ok',
        success: true,
      });

      await moveSubsystemComponents('proj-1', {
        subgraphSystemIds: ['sg-1'],
        targetSubsystemSystemId: null,
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/projects/proj-1/subsystems/components/move',
        {subgraphSystemIds: ['sg-1'], targetSubsystemSystemId: null},
      );
    });

    it('normalizes sparse successful move responses', async () => {
      mockPost.mockResolvedValue({
        data: {
          updatedSubsystems: [{parentSystemId: 'ss-target', systemId: 'ss-2'}],
        },
        message: 'ok',
        success: true,
      });

      const result = await moveSubsystemComponents('proj-1', {
        subsystemSystemIds: ['ss-2'],
        targetSubsystemSystemId: 'ss-target',
      });

      expect(result.data).toEqual({
        addedControlLinks: [],
        addedDataLinks: [],
        removedControlLinks: [],
        removedDataLinks: [],
        subsystemPortChanges: [],
        updatedModules: [],
        updatedSubsystems: [{parentSystemId: 'ss-target', systemId: 'ss-2'}],
      });
    });
  });

  describe('patchSubsystem', () => {
    it('PATCHes the subsystem by systemId with the partial request body', async () => {
      mockPatch.mockResolvedValue({
        data: undefined,
        message: 'ok',
        success: true,
      });

      await patchSubsystem('proj-1', 'ss-1', {name: 'New Name'});

      expect(mockPatch).toHaveBeenCalledWith(
        '/projects/proj-1/subsystems/ss-1',
        {name: 'New Name'},
      );
    });
  });
});
