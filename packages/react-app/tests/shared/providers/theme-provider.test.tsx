/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.unmock('~shared/providers/theme-provider');
jest.mock('~shared/lib/logger');
jest.mock('~shared/controls/global-toaster', () => ({showToast: jest.fn()}));

import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {Theme} from '~entities/appearance';
import {ConfigFileManager} from '~shared/config/config-manager';
import {showToast} from '~shared/controls/global-toaster';
import {ThemeProvider, useAppearance} from '~shared/providers/theme-provider';

function AppearanceControl() {
  const [appearance, setAppearance] = useAppearance();

  return (
    <>
      <span>{`${appearance.brand}-${appearance.theme}`}</span>
      <button
        onClick={() => setAppearance({brand: 'arduino', theme: Theme.DARK})}
        type="button"
      >
        Set Arduino dark
      </button>
      <button
        onClick={() => setAppearance({brand: 'qualcomm', theme: Theme.LIGHT})}
        type="button"
      >
        Set Qualcomm light
      </button>
    </>
  );
}

describe('ThemeProvider appearance', () => {
  const configManager = ConfigFileManager.instance;

  beforeEach(() => {
    document.documentElement.removeAttribute('data-brand');
    document.documentElement.removeAttribute('data-theme');
    jest.restoreAllMocks();
    jest.spyOn(configManager, 'initializeConfig').mockResolvedValue(undefined);
    jest
      .spyOn(configManager, 'getGlobalAppearance')
      .mockReturnValue({brand: 'snapdragon', theme: 'dark'});
    jest.spyOn(configManager, 'setGlobalAppearance');
    jest.spyOn(configManager, 'save').mockResolvedValue(true);
  });

  it('initializes the root with the saved brand and theme', async () => {
    render(
      <ThemeProvider>
        <AppearanceControl />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(
        'data-brand',
        'snapdragon',
      );
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
  });

  it('applies and persists an appearance selection', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <AppearanceControl />
      </ThemeProvider>,
    );

    await user.click(
      await screen.findByRole('button', {name: 'Set Arduino dark'}),
    );

    await waitFor(() => {
      expect(configManager.setGlobalAppearance).toHaveBeenCalledWith({
        brand: 'arduino',
        theme: 'dark',
      });
      expect(configManager.save).toHaveBeenCalled();
      expect(document.documentElement).toHaveAttribute('data-brand', 'arduino');
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      expect(showToast).toHaveBeenCalledWith('Appearance saved', 'success');
    });
  });

  it('restores the previous appearance when persistence fails', async () => {
    const user = userEvent.setup();
    jest.spyOn(configManager, 'save').mockResolvedValue(false);
    render(
      <ThemeProvider>
        <AppearanceControl />
      </ThemeProvider>,
    );

    await user.click(
      await screen.findByRole('button', {name: 'Set Arduino dark'}),
    );

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(
        'data-brand',
        'snapdragon',
      );
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
      expect(showToast).toHaveBeenCalledWith(
        'Failed to save appearance',
        'danger',
      );
    });
  });

  it('does not roll back a newer appearance when an earlier save fails later', async () => {
    const user = userEvent.setup();

    const deferred = <T,>() => {
      let resolveDeferred: (value: T) => void;
      let rejectDeferred: (reason?: unknown) => void;
      const promise = new Promise<T>((resolve, reject) => {
        resolveDeferred = resolve;
        rejectDeferred = reject;
      });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return {promise, reject: rejectDeferred!, resolve: resolveDeferred!};
    };

    const first = deferred<boolean>();
    const second = deferred<boolean>();

    const saveSpy = jest
      .spyOn(configManager, 'save')
      .mockReset()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    render(
      <ThemeProvider>
        <AppearanceControl />
      </ThemeProvider>,
    );

    await user.click(
      await screen.findByRole('button', {name: 'Set Arduino dark'}),
    );
    await user.click(
      await screen.findByRole('button', {name: 'Set Qualcomm light'}),
    );

    expect(saveSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve(true);
      await second.promise;
    });

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(
        'data-brand',
        'qualcomm',
      );
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      expect(showToast).toHaveBeenCalledWith('Appearance saved', 'success');
    });

    await act(async () => {
      first.resolve(false);
      await first.promise;
    });

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute(
        'data-brand',
        'qualcomm',
      );
      expect(document.documentElement).toHaveAttribute('data-theme', 'light');
      expect(showToast).not.toHaveBeenCalledWith(
        'Failed to save appearance',
        'danger',
      );
    });
  });
});
