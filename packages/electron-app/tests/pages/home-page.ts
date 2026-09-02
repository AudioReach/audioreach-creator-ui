/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Locator, Page} from '@playwright/test';

export type HomePage = {
  readonly deviceManagerButton: Locator;
  readonly devicesButton: Locator;
  readonly openFileButton: Locator;
  readonly projectsButton: Locator;
};

export function createHomePage(page: Page): HomePage {
  return {
    deviceManagerButton: page
      .getByRole('button', {name: 'Device Manager'})
      .describe('Device Manager button'),
    devicesButton: page
      .getByRole('button', {name: 'Devices'})
      .describe('Devices button'),
    openFileButton: page
      .getByRole('button', {name: 'Open File'})
      .describe('Open File button'),
    projectsButton: page
      .getByRole('button', {name: 'Projects'})
      .describe('Projects button'),
  };
}
