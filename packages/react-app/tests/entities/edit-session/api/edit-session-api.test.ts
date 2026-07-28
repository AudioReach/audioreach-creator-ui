/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/api', () => ({
  httpClient: {
    post: jest.fn(),
  },
}));

import {
  commitChanges,
  type CommitChangesResponseDto,
  createUsecases,
  type CreateUsecasesRequestDto,
  type CreateUsecasesResponseDto,
  discardChanges,
  type DiscardChangesResponseDto,
  endSession,
  stageChanges,
  type StageChangesResponseDto,
} from '~entities/edit-session';
import type {SessionResponseDto} from '~entities/project';
import {httpClient} from '~shared/api';

describe('edit-session-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUsecases', () => {
    it('should call httpClient.post with correct URL and body', async () => {
      const mockResponse: CreateUsecasesResponseDto = {
        created: [],
        deleted: [],
        issues: [],
        updated: [],
      };
      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockResponse,
        success: true,
      });

      const body: CreateUsecasesRequestDto = {
        activeSubgraphs: [],
        selectedUsecaseSystemIds: [],
      };

      const result = await createUsecases('p1', body);

      expect(httpClient.post).toHaveBeenCalledWith(
        '/projects/p1/create-usecases',
        body,
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('stageChanges', () => {
    it('should call httpClient.post with correct URL and body', async () => {
      const mockResponse: StageChangesResponseDto = {
        failedChangeIds: [],
        message: 'success',
        processedChangeIds: ['a', 'b'],
        success: true,
      };
      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockResponse,
        success: true,
      });

      const result = await stageChanges('p1', ['a', 'b']);

      expect(httpClient.post).toHaveBeenCalledWith(
        '/projects/p1/stage-changes',
        {changeIds: ['a', 'b']},
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
  });

  describe('commitChanges', () => {
    it('should call httpClient.post with enforceValidation query param', async () => {
      const mockResponse: CommitChangesResponseDto = {
        failedChangeIds: [],
        message: 'success',
        processedChangeIds: ['a'],
        success: true,
      };
      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockResponse,
        success: true,
      });

      const result = await commitChanges('p1', ['a'], true);

      expect(httpClient.post).toHaveBeenCalledWith(
        '/projects/p1/commit-changes?enforceValidation=true',
        {changeIds: ['a']},
      );
      expect(result.success).toBe(true);
    });

    it('should serialize body to {} when changeIds is undefined with enforceValidation', async () => {
      (httpClient.post as jest.Mock).mockResolvedValue({
        data: {},
        success: true,
      });

      await commitChanges('p1', undefined, true);

      const callArgs = (httpClient.post as jest.Mock).mock.calls[0];
      const body = callArgs[1];
      expect(JSON.stringify(body)).toBe('{}');
    });

    it('should serialize body to {} when changeIds is undefined without enforceValidation', async () => {
      (httpClient.post as jest.Mock).mockResolvedValue({
        data: {},
        success: true,
      });

      await commitChanges('p1');

      const callArgs = (httpClient.post as jest.Mock).mock.calls[0];
      const url = callArgs[0];
      const body = callArgs[1];
      expect(url).toBe('/projects/p1/commit-changes');
      expect(JSON.stringify(body)).toBe('{}');
    });

    it('should not include query string when enforceValidation is false', async () => {
      (httpClient.post as jest.Mock).mockResolvedValue({
        data: {},
        success: true,
      });

      await commitChanges('p1', ['a'], false);

      const callArgs = (httpClient.post as jest.Mock).mock.calls[0];
      const url = callArgs[0];
      expect(url).toBe('/projects/p1/commit-changes');
    });
  });

  describe('discardChanges', () => {
    it('should call httpClient.post with correct URL and body', async () => {
      const mockResponse: DiscardChangesResponseDto = {
        cascadedChangeIds: [],
        failedChangeIds: [],
        message: 'success',
        processedChangeIds: ['a'],
        success: true,
      };
      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockResponse,
        success: true,
      });

      const result = await discardChanges('p1', ['a']);

      expect(httpClient.post).toHaveBeenCalledWith(
        '/projects/p1/discard-changes',
        {changeIds: ['a']},
      );
      expect(result.success).toBe(true);
    });

    it('should serialize body to {} when changeIds is undefined', async () => {
      (httpClient.post as jest.Mock).mockResolvedValue({
        data: {},
        success: true,
      });

      await discardChanges('p1');

      const callArgs = (httpClient.post as jest.Mock).mock.calls[0];
      const body = callArgs[1];
      expect(JSON.stringify(body)).toBe('{}');
    });
  });

  describe('endSession', () => {
    it('should call httpClient.post with URL only, no body', async () => {
      const mockResponse: SessionResponseDto = {
        projectId: 'p1',
        sessionMode: 'DESIGNER',
        summary: 'session ended',
      };
      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockResponse,
        success: true,
      });

      const result = await endSession('p1');

      expect(httpClient.post).toHaveBeenCalledWith('/projects/p1/end-session');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });
  });
});
