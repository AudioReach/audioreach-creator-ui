/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

import type {
  BackendConnectionSlice,
  RegistrationStatus,
} from '../global-store.types';

export function createBackendConnectionSlice(
  set: (partial: Partial<BackendConnectionSlice>) => void,
  get: () => BackendConnectionSlice,
): BackendConnectionSlice {
  return {
    failCount: 0,
    incrementFail: (errorMessage?: string) => {
      const next = get().failCount + 1;
      set({
        failCount: next,
        isConnected: false,
        lastError: errorMessage ?? get().lastError,
      });
    },
    // Assume available at startup; updated on first API call.
    isConnected: true,
    lastError: null,
    lastHealthCheckAt: null,

    markAvailable: () => {
      set({isConnected: true, lastError: null});
      logger.debug('Backend marked available', {
        action: 'mark_available',
        component: 'BackendConnectionSlice',
      });
    },

    markUnavailable: (errorMessage?: string) => {
      set({
        isConnected: false,
        lastError: errorMessage ?? null,
        registrationStatus: 'unregistered',
      });
      logger.debug('Backend marked unavailable', {
        action: 'mark_unavailable',
        component: 'BackendConnectionSlice',
        error: errorMessage,
      });
    },

    registrationStatus: 'unregistered',

    resetFailures: () => {
      set({failCount: 0, lastError: null});
    },

    setConnected: (connected: boolean) => {
      set({isConnected: connected});
      logger.debug('Backend connection status changed', {
        action: 'set_connected',
        component: 'BackendConnectionSlice',
      });
    },

    setLastHealthCheckAt: (ts: number) => {
      set({lastHealthCheckAt: ts});
    },

    setRegistrationStatus: (status: RegistrationStatus) => {
      set({registrationStatus: status});
      logger.debug('Registration status changed', {
        action: 'set_registration_status',
        component: 'BackendConnectionSlice',
      });
    },
  };
}
