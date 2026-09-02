/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';

import type {CommandFactory} from '../../framework/command';

export const expandSideNav: CommandFactory<void, void> = () => ({
  execute: async (context) => {
    await expect(context.pages.sideNav.root).toHaveAttribute(
      'data-state',
      'closed',
    );
    await expect(context.pages.sideNav.expandButton).toBeVisible();
    await context.pages.sideNav.expandButton.click();
    await expect(context.pages.sideNav.root).toHaveAttribute(
      'data-state',
      'open',
      {timeout: 2000},
    );
  },
  id: 'navigation.expand-side-nav',
});
