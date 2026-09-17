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
  {status = 200, statusText}: {status?: number; statusText?: string} = {},
) {
  return {
    headers: {get: jest.fn().mockReturnValue('application/json')},
    json: jest.fn().mockResolvedValue(body),
    ok: status >= 200 && status < 300,
    status,
    statusText:
      statusText ??
      (status === 200
        ? 'OK'
        : status === 404
          ? 'Not Found'
          : 'Internal Server Error'),
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
      expect(result.data).toEqual({id: 1});
    });

    it('returns mapped ApiResult<T> on success', async () => {
      const client = makeClient();
      const resp = mockJsonResponse({
        data: {id: 42, name: 'updated'},
      });
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const result = await client.put<{id: number; name: string}>('/resource', {
        name: 'updated',
      });

      expect(result.data).toEqual({id: 42, name: 'updated'});
    });

    it('supports request overrides', async () => {
      const client = makeClient();
      const resp = mockJsonResponse({data: null});
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
      const resp = mockJsonResponse({data: null});
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
      const resp = mockJsonResponse({data: null});
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
    it('returns a transport issue on 4xx without retrying', async () => {
      const client = makeClient();
      const resp = mockJsonResponse({}, {status: 404});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const result = await client.get('/missing');

      expect(result.data).toBeUndefined();
      expect(result.issues).toEqual([
        expect.objectContaining({
          code: 'TRANSPORT_HTTP_404',
          severity: 'ERROR',
        }),
      ]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('retries on 5xx up to maxRetries then returns a transport issue', async () => {
      const client = makeClient({
        maxRetries: 2,
        retryBaseDelayMs: 0,
        retryJitterMs: 0,
      });
      const resp = mockJsonResponse({}, {status: 500});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const result = await client.get('/flaky');

      expect(result.issues).toEqual([
        expect.objectContaining({
          code: 'TRANSPORT_HTTP_500',
          severity: 'ERROR',
        }),
      ]);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('returns a timeout issue on AbortError without retrying', async () => {
      const client = makeClient();
      const abortError = new DOMException(
        'The operation was aborted',
        'AbortError',
      );
      (global.fetch as jest.Mock).mockRejectedValue(abortError);

      const result = await client.get('/slow');

      expect(result.issues).toEqual([
        expect.objectContaining({
          code: 'TRANSPORT_TIMEOUT',
          message: 'Request timed out',
          severity: 'ERROR',
        }),
      ]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('returns a network issue after rejected fetch retries are exhausted', async () => {
      const client = makeClient({maxRetries: 0});
      (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await client.get('/unreachable');

      expect(result.issues).toEqual([
        expect.objectContaining({
          code: 'TRANSPORT_NETWORK',
          severity: 'ERROR',
        }),
      ]);
      expect(mockStore.markUnavailable).toHaveBeenCalled();
      expect(mockStore.incrementFail).toHaveBeenCalled();
    });

    it('returns an invalid JSON issue when parsing fails', async () => {
      const client = makeClient();
      const resp = {
        headers: {get: jest.fn().mockReturnValue('application/json')},
        json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
        ok: true,
        status: 200,
        statusText: 'OK',
      };
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const result = await client.get('/bad-json');

      expect(result.issues).toEqual([
        expect.objectContaining({
          code: 'TRANSPORT_INVALID_JSON',
          severity: 'ERROR',
        }),
      ]);
    });

    it('returns an invalid multipart issue when parsing fails', async () => {
      const client = makeClient();
      const resp = {
        formData: jest.fn().mockRejectedValue(new Error('Bad multipart')),
        headers: {get: jest.fn().mockReturnValue('multipart/form-data')},
        ok: true,
        status: 200,
        statusText: 'OK',
      };
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const result = await client.get<FormData>('/bad-multipart');

      expect(result.issues).toEqual([
        expect.objectContaining({
          code: 'TRANSPORT_INVALID_MULTIPART',
          severity: 'ERROR',
        }),
      ]);
    });

    it('preserves data and issues from a 207 JSON envelope', async () => {
      const client = makeClient();
      const envelope = {
        data: {id: 7},
        issues: [
          {
            code: 'PARTIAL',
            message: 'Partial response',
            severity: 'WARNING',
          },
        ],
      };
      const resp = mockJsonResponse(envelope, {
        status: 207,
        statusText: 'Multi-Status',
      });
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      const result = await client.get('/partial');

      expect(result).toEqual(envelope);
    });

    it('calls markUnavailable and incrementFail on repeated 5xx failure', async () => {
      const client = makeClient({
        maxRetries: 1,
        retryBaseDelayMs: 0,
        retryJitterMs: 0,
      });
      const resp = mockJsonResponse({}, {status: 500});
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

      expect(result.issues?.[0]?.message).toContain('Network error');
      expect(mockStore.markUnavailable).toHaveBeenCalled();
      expect(mockStore.incrementFail).toHaveBeenCalled();
    });
  });

  describe('success state', () => {
    it('calls markAvailable when backend was previously disconnected', async () => {
      mockStore.isConnected = false;
      const client = makeClient();
      const resp = mockJsonResponse({data: null});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.get('/health');

      expect(mockStore.markAvailable).toHaveBeenCalled();
    });

    it('resets failures when failCount > 0', async () => {
      mockStore.failCount = 3;
      const client = makeClient();
      const resp = mockJsonResponse({data: null});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.get('/health');

      expect(mockStore.resetFailures).toHaveBeenCalled();
    });
  });

  describe('auth token', () => {
    it('adds the bearer token to requests when configured', async () => {
      const client = makeClient();
      client.setAuthToken('token-123');
      const resp = mockJsonResponse({data: null});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.get('/secure');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/arc-api\/v1\/secure$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token-123',
          }),
        }),
      );
    });

    it('merges the bearer token with request override headers', async () => {
      const client = makeClient();
      client.setAuthToken('token-123');
      const resp = mockJsonResponse({data: null});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.put(
        '/secure',
        {name: 'test'},
        {headers: {'X-Custom-Header': 'custom-value'}},
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/arc-api\/v1\/secure$/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token-123',
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          }),
        }),
      );
    });

    it('does not add the bearer token when auth is skipped', async () => {
      const client = makeClient();
      client.setAuthToken('token-123');
      const resp = mockJsonResponse({data: null});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.post(
        '/auth/register',
        {clientName: 'audioreach-creator-ui'},
        {skipAuth: true},
      );

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('preserves the bearer token after a backend connection failure', async () => {
      const client = makeClient({maxRetries: 0});
      client.setAuthToken('token-123');
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('ECONNREFUSED'),
      );

      await client.get('/unreachable');

      const resp = mockJsonResponse({data: null});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.get('/after-failure');

      const [, options] = (global.fetch as jest.Mock).mock.calls[1];
      expect(options.headers).toEqual({
        Authorization: 'Bearer token-123',
      });
    });

    it('clears the bearer token when explicitly requested', async () => {
      const client = makeClient();
      client.setAuthToken('token-123');
      client.clearAuthToken();
      const resp = mockJsonResponse({data: null});
      (global.fetch as jest.Mock).mockResolvedValue(resp);

      await client.get('/after-clear');

      const [, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(options.headers).toBeUndefined();
    });
  });
});
