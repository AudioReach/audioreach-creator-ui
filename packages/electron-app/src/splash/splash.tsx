/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  FailureReason,
  SplashApi,
  SplashPhase,
} from '@audioreach-creator-ui/api-utils';

declare global {
  interface Window {
    splashApi: SplashApi;
  }
}

import {useEffect, useState} from 'react';

import {createRoot} from 'react-dom/client';

import {Button} from '@qualcomm-ui/react/button';
import {ProgressRing} from '@qualcomm-ui/react/progress-ring';

import {
  INITIAL_SPLASH_STATE,
  reduceSplashState,
  type SplashState,
} from './splash-state';

function App() {
  const [state, setState] = useState<SplashState>(INITIAL_SPLASH_STATE);

  useEffect(() => {
    const offStatus = window.splashApi.onStatus(
      (phase: SplashPhase, message: string) => {
        setState((s) => reduceSplashState(s, {message, phase, type: 'status'}));
      },
    );
    const offFailed = window.splashApi.onFailed(
      (reason: FailureReason, message: string) => {
        setState((s) => reduceSplashState(s, {message, reason, type: 'failed'}));
      },
    );

    return () => {
      offStatus();
      offFailed();
    };
  }, []);

  return (
    <div className="relative flex h-screen flex-col items-center justify-center p-6">
      <h1 className="mb-6 text-xl">AudioReach™ Creator</h1>

      {state.kind === 'connecting' && (
        <>
          <ProgressRing className="mb-2" />
          <p className="text-sm text-neutral-secondary" id="status-text">
            {state.message}
          </p>
        </>
      )}

      {state.kind === 'failed' && (
        <p className="text-sm text-neutral-secondary" id="status-text">
          {state.message}
        </p>
      )}

      <Button
        className="mt-4"
        emphasis="neutral"
        id="quit-button"
        onClick={() => void window.splashApi.quit()}
      >
        Quit
      </Button>
    </div>
  );
}

createRoot(document.getElementById('splash-root')!).render(<App />);
