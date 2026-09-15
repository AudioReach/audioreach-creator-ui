/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Button} from '@qualcomm-ui/react/button';
import {ProgressRing} from '@qualcomm-ui/react/progress-ring';
import {lazy, Suspense, useCallback, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';

import {ensureRegistered} from '~shared/api';
import {logger} from '~shared/lib/logger';

import './index.css';

type BootstrapState = 'ready' | 'registering' | 'unavailable';

const ThemeProvider = lazy(async () => {
  const module = await import('~shared/providers/theme-provider');
  return {default: module.ThemeProvider};
});

const EditorShell = lazy(async () => {
  const module = await import('~widgets/editor-shell');
  return {default: module.EditorShell};
});

function RegistrationLoading() {
  return (
    <main
      aria-live="polite"
      className="flex min-h-screen items-center justify-center"
      role="status"
    >
      <div className="text-neutral-secondary flex items-center gap-3">
        <ProgressRing size="md" />
        <span>Connecting to AudioReach Creator backend...</span>
      </div>
    </main>
  );
}

export function AppBootstrap() {
  const [state, setState] = useState<BootstrapState>('registering');

  const register = useCallback(async () => {
    setState('registering');
    try {
      setState((await ensureRegistered()) ? 'ready' : 'unavailable');
    } catch (error) {
      logger.error('Unexpected error during client registration', {
        action: 'bootstrap_registration_exception',
        component: 'AppBootstrap',
        error: error instanceof Error ? error.message : String(error),
      });
      setState('unavailable');
    }
  }, []);

  useEffect(() => {
    void register();
  }, [register]);

  if (state === 'registering') {
    return <RegistrationLoading />;
  }

  if (state === 'unavailable') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <p className="text-status-error" role="alert">
            Unable to connect to AudioReach Creator backend.
          </p>
          <Button onClick={() => void register()} size="md" variant="outline">
            Retry
          </Button>
        </div>
      </main>
    );
  }

  return (
    <Suspense fallback={<RegistrationLoading />}>
      <ThemeProvider>
        <EditorShell />
      </ThemeProvider>
    </Suspense>
  );
}

createRoot(document.getElementById('root')!).render(<AppBootstrap />);
