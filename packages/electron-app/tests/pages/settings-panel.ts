/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect, type Locator, type Page} from '@playwright/test';

export type SettingsPanel = {
  readonly darkThemeOption: Locator;
  readonly lightThemeOption: Locator;
  open(): Promise<void>;
  rootTheme(): Promise<string | null>;
};

export function createSettingsPanel(page: Page): SettingsPanel {
  const lightThemeOption = page
    .locator('label[data-radio-part="item"]')
    .filter({hasText: 'Light'});

  const darkThemeOption = page
    .locator('label[data-radio-part="item"]')
    .filter({hasText: 'Dark'});

  return {
    darkThemeOption,
    lightThemeOption,
    async open() {
      await page.getByText('Settings', {exact: true}).click();
      await expect(lightThemeOption).toBeVisible();
      await expect(darkThemeOption).toBeVisible();
    },
    rootTheme() {
      return page.locator('html').getAttribute('data-theme');
    },
  };
}
