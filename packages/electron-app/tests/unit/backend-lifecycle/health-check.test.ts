/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {jest} from '@jest/globals';

import {
  probeHealthy,
  waitUntilFileExists,
  waitUntilHealthy,
} from '../../../src/backend-lifecycle/health-check';

jest.mock('node:fs', () => ({existsSync: jest.fn()}));

describe('probeHealthy', () => {
  it('resolves true on a single successful /health/live response', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ok: true, status: 200} as Response);

    const result = await probeHealthy(
      3000,
      fetchImpl as unknown as typeof fetch,
    );

    expect(result).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3000/health/live',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('resolves false on a single failed fetch, with no retry', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await probeHealthy(
      3000,
      fetchImpl as unknown as typeof fetch,
    );

    expect(result).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('treats a non-2xx response as unhealthy', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ok: false, status: 503} as Response);

    const result = await probeHealthy(
      3000,
      fetchImpl as unknown as typeof fetch,
    );

    expect(result).toBe(false);
  });
});

describe('waitUntilFileExists', () => {
  it('resolves immediately when the file already exists', async () => {
    const {existsSync} = jest.requireMock('node:fs') as {
      existsSync: jest.Mock;
    };
    existsSync.mockReturnValue(true);

    await expect(
      waitUntilFileExists('/some/path/config.json', 5),
    ).resolves.toBeUndefined();
  });

  it('keeps polling until the file appears', async () => {
    const {existsSync} = jest.requireMock('node:fs') as {
      existsSync: jest.Mock;
    };
    existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    await waitUntilFileExists('/some/path/config.json', 1);

    expect(existsSync).toHaveBeenCalledTimes(3);
  });
});

describe('waitUntilHealthy', () => {
  it('resolves once the given endpoint responds successfully', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue({ok: true, status: 200} as Response);

    await waitUntilHealthy(
      3000,
      '/health/ready',
      5,
      fetchImpl as unknown as typeof fetch,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:3000/health/ready',
    );
  });

  it('keeps polling through failures until the endpoint succeeds', async () => {
    const fetchImpl = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({ok: false, status: 503} as Response)
      .mockResolvedValue({ok: true, status: 200} as Response);

    await waitUntilHealthy(
      3000,
      '/health/live',
      1,
      fetchImpl as unknown as typeof fetch,
    );

    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
