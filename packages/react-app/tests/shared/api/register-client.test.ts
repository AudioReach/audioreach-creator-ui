/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

const mockHttpClient = {
  clearAuthToken: jest.fn(),
  post: jest.fn(),
  setAuthToken: jest.fn(),
};

const mockStore = {
  incrementFail: jest.fn(),
  isConnected: true,
  markAvailable: jest.fn(),
  markUnavailable: jest.fn(),
  registrationStatus: 'unregistered',
  resetFailures: jest.fn(),
  setLastHealthCheckAt: jest.fn(),
  setRegistrationStatus: jest.fn(),
};

jest.mock('~shared/api/http-client', () => ({
  httpClient: mockHttpClient,
}));

jest.mock('~shared/store/global-store', () => ({
  useGlobalStore: {getState: jest.fn(() => mockStore)},
}));

import {
  ensureRegistered,
  resetConnectionFailures,
} from '~shared/api/register-client';
import {logger} from '~shared/lib/logger';

describe('ensureRegistered', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.registrationStatus = 'unregistered';
  });

  it('registers without auth and stores the returned token', async () => {
    mockHttpClient.post.mockResolvedValue({
      data: {
        clientId: 'client-1',
        clientName: 'audioreach-creator-ui',
        token: 'token-123',
      },
    });

    const result = await ensureRegistered();

    expect(result).toBe(true);
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/auth/register',
      {clientName: 'audioreach-creator-ui'},
      {skipAuth: true},
    );
    expect(mockStore.setRegistrationStatus).toHaveBeenCalledWith(
      'registering',
    );
    expect(mockHttpClient.setAuthToken).toHaveBeenCalledWith('token-123');
    expect(logger.setClientId).toHaveBeenCalledWith('client-1');
    expect(mockStore.setRegistrationStatus).toHaveBeenCalledWith('registered');
    expect(mockStore.markAvailable).toHaveBeenCalled();
    expect(mockStore.resetFailures).toHaveBeenCalled();
  });

  it('does not register when the token is missing', async () => {
    mockHttpClient.post.mockResolvedValue({
      data: {
        clientId: 'client-1',
        clientName: 'audioreach-creator-ui',
      },
    });

    const result = await ensureRegistered();

    expect(result).toBe(false);
    expect(mockHttpClient.clearAuthToken).not.toHaveBeenCalled();
    expect(mockHttpClient.setAuthToken).not.toHaveBeenCalled();
    expect(mockStore.incrementFail).toHaveBeenCalledWith(
      'No registration token received from backend',
    );
    expect(mockStore.markUnavailable).toHaveBeenCalledWith(
      'No registration token received from backend',
    );
    expect(mockStore.setRegistrationStatus).toHaveBeenCalledWith('error');
  });

  it('does not register when the client ID is missing', async () => {
    mockHttpClient.post.mockResolvedValue({
      data: {
        clientName: 'audioreach-creator-ui',
        token: 'token-123',
      },
    });

    const result = await ensureRegistered();

    expect(result).toBe(false);
    expect(mockHttpClient.clearAuthToken).not.toHaveBeenCalled();
    expect(mockHttpClient.setAuthToken).not.toHaveBeenCalled();
    expect(mockStore.incrementFail).toHaveBeenCalledWith(
      'No client ID received from backend',
    );
    expect(mockStore.markUnavailable).toHaveBeenCalledWith(
      'No client ID received from backend',
    );
    expect(mockStore.setRegistrationStatus).toHaveBeenCalledWith('error');
  });

  it('does not register when the backend returns a transport issue', async () => {
    mockHttpClient.post.mockResolvedValue({
      issues: [
        {
          code: 'TRANSPORT_HTTP_422',
          message: 'Unprocessable',
          severity: 'ERROR',
        },
      ],
    });

    const result = await ensureRegistered();

    expect(result).toBe(false);
    expect(mockHttpClient.setAuthToken).not.toHaveBeenCalled();
    expect(mockStore.incrementFail).toHaveBeenCalledWith('Unprocessable');
    expect(mockStore.markUnavailable).toHaveBeenCalledWith('Unprocessable');
    expect(mockStore.setRegistrationStatus).toHaveBeenCalledWith('error');
  });

  it('does not clear token state when connection failures are reset', () => {
    resetConnectionFailures();

    expect(mockStore.resetFailures).toHaveBeenCalled();
    expect(mockHttpClient.clearAuthToken).not.toHaveBeenCalled();
  });
});
