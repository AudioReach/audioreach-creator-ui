/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';

import type {CommandFactory} from '../../framework/command';

export const openAbout: CommandFactory<void, void> = () => ({
  execute: async (context) => {
    await expect(context.pages.sideNav.aboutButton).toBeVisible();
    await context.pages.sideNav.aboutButton.click();
    await expect(context.page.getByText('About AudioReach Creator')).toBeVisible({
      timeout: 3000,
    });
  },
  id: 'navigation.open-about',
});
