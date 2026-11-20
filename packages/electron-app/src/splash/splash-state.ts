/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  FailureReason,
  SplashPhase,
} from '@audioreach-creator-ui/api-utils';

export type SplashState =
  | {kind: 'connecting'; message: string; phase: SplashPhase}
  | {kind: 'failed'; message: string; reason: FailureReason};

export type SplashEvent =
  | {message: string; phase: SplashPhase; type: 'status'}
  | {message: string; reason: FailureReason; type: 'failed'};

export const INITIAL_SPLASH_STATE: SplashState = {
  kind: 'connecting',
  message: 'Starting AudioReach Creator...',
  phase: 'starting',
};

/** Pure reducer driving the splash UI from events pushed by the main process. */
export function reduceSplashState(
  _state: SplashState,
  event: SplashEvent,
): SplashState {
  switch (event.type) {
    case 'status':
      return {kind: 'connecting', message: event.message, phase: event.phase};
    case 'failed':
      return {kind: 'failed', message: event.message, reason: event.reason};
  }
}
