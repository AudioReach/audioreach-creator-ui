/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';

import type {CommandFactory} from '../../framework/command';

export const showHomeControls: CommandFactory<void, void> = () => ({
  execute: async (context) => {
    await expect(context.pages.home.projectsButton).toBeVisible();
    await expect(context.pages.home.devicesButton).toBeVisible();
    await expect(context.pages.home.openFileButton).toBeVisible();
    await expect(context.pages.home.deviceManagerButton).toBeVisible();
  },
  id: 'home.show-controls',
});
