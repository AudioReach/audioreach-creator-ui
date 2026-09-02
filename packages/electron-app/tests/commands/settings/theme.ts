/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';

import type {CommandFactory} from '../../framework/command';

export const toggleTheme: CommandFactory<void, string | null> = () => ({
  execute: async (context) => {
    const currentTheme = await context.pages.settings.rootTheme();
    if (currentTheme === 'dark') {
      await context.pages.settings.lightThemeOption.click();
    } else {
      await context.pages.settings.darkThemeOption.click();
    }
    const expectedTheme = currentTheme === 'dark' ? 'light' : 'dark';
    await expect(context.page.locator('html')).toHaveAttribute(
      'data-theme',
      expectedTheme,
    );

    return context.pages.settings.rootTheme();
  },
  id: 'settings.toggle-theme',
});
