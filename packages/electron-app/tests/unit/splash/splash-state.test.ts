/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  INITIAL_SPLASH_STATE,
  reduceSplashState,
} from '../../../src/splash/splash-state';

describe('reduceSplashState', () => {
  it('starts in a connecting state with the starting phase', () => {
    expect(INITIAL_SPLASH_STATE).toEqual({
      kind: 'connecting',
      message: 'Starting AudioReach Creator...',
      phase: 'starting',
    });
  });

  it('transitions to connecting with updated phase/message on a status event', () => {
    const next = reduceSplashState(INITIAL_SPLASH_STATE, {
      message: 'Starting AudioReach Creator backend...',
      phase: 'starting',
      type: 'status',
    });

    expect(next).toEqual({
      kind: 'connecting',
      message: 'Starting AudioReach Creator backend...',
      phase: 'starting',
    });
  });

  it('transitions to failed with reason/message on a failed event', () => {
    const next = reduceSplashState(INITIAL_SPLASH_STATE, {
      message: 'AudioReach Creator backend not found.',
      reason: 'backend-binary-missing',
      type: 'failed',
    });

    expect(next).toEqual({
      kind: 'failed',
      message: 'AudioReach Creator backend not found.',
      reason: 'backend-binary-missing',
    });
  });

  it('a subsequent status event after a failed state returns to connecting', () => {
    const failed = reduceSplashState(INITIAL_SPLASH_STATE, {
      message: 'Failed to start the AudioReach Creator backend process.',
      reason: 'spawn-failed',
      type: 'failed',
    });

    const next = reduceSplashState(failed, {
      message: 'Checking for running backend...',
      phase: 'starting',
      type: 'status',
    });

    expect(next).toEqual({
      kind: 'connecting',
      message: 'Checking for running backend...',
      phase: 'starting',
    });
  });
});
