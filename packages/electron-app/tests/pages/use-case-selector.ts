/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect, type Locator, type Page} from '@playwright/test';

export type UseCaseSelector = {
  close(): Promise<void>;
  filter(value: string): Promise<void>;
  open(): Promise<void>;
  options(): Locator;
  select(value: string): Promise<void>;
  selectAll(): Promise<void>;
  selectFirst(): Promise<string>;
};

export function createUseCaseSelector(page: Page): UseCaseSelector {
  const usecaseSelector = page
    .getByRole('textbox', {name: 'Search for usecases'})
    .describe('Use case filter');

  const selectAllCheckbox = page.getByRole('checkbox', {
    exact: true,
    name: 'Select all usecases',
  });

  const selectAllLabel = page.getByText('Select All', {
    exact: true,
  });

  const expandButton = page.getByRole('button', {name: 'Expand Default'});
  const doneButton = page.getByRole('button', {exact: true, name: 'Done'});

  function options(): Locator {
    return page.getByRole('checkbox', {
      name: /^Select (?!all usecases\b).+/i,
    });
  }

  async function selectOption(option: Locator): Promise<string> {
    const label = page.locator('label').filter({has: option}).first();
    const value = (await label.innerText()).trim();

    await label.click();
    await expect(option).toBeChecked();
    return value;
  }

  return {
    close: () => doneButton.click(),
    filter: (value) => usecaseSelector.fill(value),
    open: () => usecaseSelector.click(),
    options,
    select: async (value) => {
      await selectOption(
        page.getByRole('checkbox', {exact: true, name: `Select ${value}`}),
      );
    },
    selectAll: async () => {
      await selectAllLabel.click();
      await expect(selectAllCheckbox).toBeChecked();
    },
    selectFirst: async () => {
      if (await expandButton.isVisible()) {
        await expandButton.click();
      }
      return selectOption(options().first());
    },
  };
}
