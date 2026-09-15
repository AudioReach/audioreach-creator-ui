/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {ReactNode} from 'react';
import type {Root} from 'react-dom/client';

jest.mock('~shared/lib/logger');

const mockEnsureRegistered = jest.fn<() => Promise<boolean>>();

type ReactDomClientModule = {
  createRoot: (container: Element | DocumentFragment) => Root;
};

jest.mock('~shared/api', () => ({
  ensureRegistered: mockEnsureRegistered,
}));

jest.mock('react-dom/client', () => {
  const actual = jest.requireActual<ReactDomClientModule>('react-dom/client');

  return {
    ...actual,
    createRoot: jest.fn((container: Element | DocumentFragment | null) => {
      if (!container) {
        return {render: jest.fn(), unmount: jest.fn()};
      }
      return actual.createRoot(container);
    }),
  };
});

jest.mock('~shared/providers/theme-provider', () => ({
  ThemeProvider: ({children}: {children: ReactNode}) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

jest.mock('~widgets/editor-shell', () => ({
  EditorShell: () => <div data-testid="editor-shell" />,
}));

import {AppBootstrap} from '../src/main';
import {logger} from '~shared/lib/logger';

function deferred<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {promise, reject: rejectPromise, resolve: resolvePromise};
}

describe('AppBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders startup feedback before registration resolves', () => {
    const registration = deferred<boolean>();
    mockEnsureRegistered.mockReturnValue(registration.promise);

    render(<AppBootstrap />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Connecting to AudioReach Creator backend',
    );
    expect(screen.queryByTestId('editor-shell')).not.toBeInTheDocument();
  });

  it('mounts the provider and editor only after registration succeeds', async () => {
    mockEnsureRegistered.mockResolvedValue(true);

    render(<AppBootstrap />);

    expect(screen.queryByTestId('editor-shell')).not.toBeInTheDocument();
    expect(await screen.findByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByTestId('editor-shell')).toBeInTheDocument();
  });

  it('blocks the editor and offers Retry when registration fails', async () => {
    mockEnsureRegistered.mockResolvedValue(false);

    render(<AppBootstrap />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to connect to AudioReach Creator backend.',
    );
    expect(screen.getByRole('button', {name: 'Retry'})).toBeEnabled();
    expect(screen.queryByTestId('editor-shell')).not.toBeInTheDocument();
  });

  it('retries registration and mounts the editor after recovery', async () => {
    const user = userEvent.setup();
    mockEnsureRegistered.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    render(<AppBootstrap />);
    await user.click(await screen.findByRole('button', {name: 'Retry'}));

    await waitFor(() => {
      expect(mockEnsureRegistered).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByTestId('editor-shell')).toBeInTheDocument();
  });

  it('logs an unexpected rejection and shows the generic recovery state', async () => {
    mockEnsureRegistered.mockRejectedValue(new Error('unexpected failure'));

    render(<AppBootstrap />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(logger.error).toHaveBeenCalledWith(
      'Unexpected error during client registration',
      expect.objectContaining({component: 'AppBootstrap'}),
    );
  });
});
