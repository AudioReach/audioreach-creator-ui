/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {Locator, Page} from '@playwright/test';

export type SideNav = {
  readonly aboutButton: Locator;
  readonly expandButton: Locator;
  readonly root: Locator;
  state(): Promise<'closed' | 'open'>;
};

export function createSideNav(page: Page): SideNav {
  const root = page
    .locator('[data-side-nav-part="root"]')
    .describe('side navigation');

  return {
    aboutButton: root.getByText('About').describe('About navigation item'),
    expandButton: root
      .locator('[data-side-nav-part="trigger"]')
      .describe('side navigation toggle'),
    root,
    async state() {
      const state = await root.getAttribute('data-state');

      if (state !== 'closed' && state !== 'open') {
        throw new Error(`Unexpected side navigation state: ${state}`);
      }

      return state;
    },
  };
}
