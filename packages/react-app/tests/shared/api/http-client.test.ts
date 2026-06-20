/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

const mockStore = {
  failCount: 0,
  incrementFail: jest.fn(),
  isConnected: true,
  markAvailable: jest.fn(),
  markUnavailable: jest.fn(),
  resetFailures: jest.fn(),
};

jest.mock('~shared/lib/logger');
jest.mock('~shared/store/global-store', () => ({
  useGlobalStore: {getState: jest.fn(() => mockStore)},
}));

import {HttpClient} from '~shared/api/http-client';

global.fetch = jest.fn();

function makeClient(overrides?: ConstructorParameters<typeof HttpClient>[0]) {
  return new HttpClient({
    baseUrl: 'http://localhost:3000/arc-api/v1',
    maxRetries: 2,
    retryBaseDelayMs: 0,
    retryJitterMs: 0,
    timeoutMs: 10000,
    ...overrides,
  });
}

function mockJsonResponse(
  body: unknown,
  {status = 200}: {status?: number} = {},
) {
  return {
    headers: {get: jest.fn().mockReturnValue('application/json')},
    json: jest.fn().mockResolvedValue(body),
    ok: status >= 200 && status < 300,
    status,
    statusText:
      status === 200
        ? 'OK'
        : status === 404
          ? 'Not Found'
          : 'Internal Server Error',
  };
}

describe('HttpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockStore, {
      failCount: 0,
      isConnected: true,
    });
  });

  describe('put method', () => {
    it('issues a PUT request with JSON body and Content-Type header', async () => {
      const client = makeClient();
      const resp = mockJsonResponse({
        data: {id: 1},
        message: 'OK',
        success: true,
      });
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const body = {name: 'test'};
      const result = await client.put('/endpoint', body);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/arc-api\/v1\/endpoint$/),
        expect.objectContaining({
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          method: 'PUT',
        }),
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({id: 1});
    });

    it('returns mapped ApiResult<T> on success', async () => {
      const client = makeClient();
      const resp = mockJsonResponse({
        data: {id: 42, name: 'updated'},
        message: 'Updated successfully',
        success: true,
      });
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const result = await client.put<{id: number; name: string}>('/resource', {
        name: 'updated',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Updated successfully');
      expect(result.data).toEqual({id: 42, name: 'updated'});
    });

    it('supports request overrides', async () => {
      const client = makeClient();
      const resp = mockJsonResponse({message: 'OK', success: true});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const customHeaders = {'X-Custom-Header': 'custom-value'};
      await client.put('/endpoint', {data: 'test'}, {headers: customHeaders});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/arc-api\/v1\/endpoint$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          }),
          method: 'PUT',
        }),
      );
    });

    it('omits Content-Type when body is FormData', async () => {
      const client = makeClient();
      const resp = mockJsonResponse({message: 'OK', success: true});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const form = new FormData();
      form.append('file', 'content');
      await client.put('/upload', form);

      const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
      expect(opts.headers).not.toHaveProperty('Content-Type');
      expect(opts.body).toBe(form);
    });
  });

  describe('patch method', () => {
    it('omits Content-Type when body is FormData', async () => {
      const client = makeClient();
      const resp = mockJsonResponse({message: 'OK', success: true});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const form = new FormData();
      form.append('field', 'value');
      await client.patch('/resource', form);

      const [, opts] = (global.fetch as jest.Mock).mock.calls[0];
      expect(opts.headers).not.toHaveProperty('Content-Type');
      expect(opts.body).toBe(form);
    });
  });

  describe('error handling', () => {
    it('returns success: false on 4xx without retrying', async () => {
      const client = makeClient();
      const resp = mockJsonResponse(
        {message: 'Not Found', success: false},
        {status: 404},
      );
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const result = await client.get('/missing');

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx up to maxRetries then fails', async () => {
      const client = makeClient({
        maxRetries: 2,
        retryBaseDelayMs: 0,
        retryJitterMs: 0,
      });
      const resp = mockJsonResponse(
        {message: 'Internal Server Error', success: false},
        {status: 500},
      );
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const result = await client.get('/flaky');

      expect(result.success).toBe(false);
      // 1 initial + 2 retries = 3 total
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('returns "Request timed out" on AbortError without retrying', async () => {
      const client = makeClient();
      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError',
      );
      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      const result = await client.get('/slow');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Request timed out');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('calls markUnavailable and incrementFail on repeated 5xx failure', async () => {
      const client = makeClient({
        maxRetries: 1,
        retryBaseDelayMs: 0,
        retryJitterMs: 0,
      });
      const resp = mockJsonResponse(
        {message: 'Server Error', success: false},
        {status: 500},
      );
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.get('/server-error');

      expect(mockStore.markUnavailable).toHaveBeenCalledWith(
        'HTTP error: 500 Internal Server Error',
      );
      expect(mockStore.incrementFail).toHaveBeenCalledWith(
        'HTTP error: 500 Internal Server Error',
      );
    });

    it('calls markUnavailable and incrementFail on network error', async () => {
      const client = makeClient({maxRetries: 0});
      (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await client.get('/unreachable');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
      expect(mockStore.markUnavailable).toHaveBeenCalled();
      expect(mockStore.incrementFail).toHaveBeenCalled();
    });
  });

  describe('success state', () => {
    it('calls markAvailable when backend was previously disconnected', async () => {
      mockStore.isConnected = false;
      const client = makeClient();
      const resp = mockJsonResponse({data: null, message: 'OK', success: true});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.get('/health');

      expect(mockStore.markAvailable).toHaveBeenCalled();
    });

    it('resets failures when failCount > 0', async () => {
      mockStore.failCount = 3;
      const client = makeClient();
      const resp = mockJsonResponse({data: null, message: 'OK', success: true});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.get('/health');

      expect(mockStore.resetFailures).toHaveBeenCalled();
    });
  });
});
