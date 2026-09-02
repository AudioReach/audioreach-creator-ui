/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect, test} from '@playwright/test';

import type {TestContext} from '../../framework/test-context';
import {createUseCaseSelector} from '../../pages/use-case-selector';
import {
  filterAndSelectUseCase,
  selectAllUseCases,
  selectFirstUseCase,
} from './select-use-case';

function createContext(selector: TestContext['pages']['useCaseSelector']) {
  return {
    pages: {useCaseSelector: selector},
  } as TestContext;
}

test('selectFirstUseCase returns the selector-selected option', async () => {
  const calls: string[] = [];
  const selector = {
    close: () => {
      calls.push('close');
      return Promise.resolve();
    },
    filter: () => Promise.resolve(),
    open: () => {
      calls.push('open');
      return Promise.resolve();
    },
    options: () => undefined,
    select: () => Promise.resolve(),
    selectFirst: () => {
      calls.push('select-first');
      return Promise.resolve('first available use case');
    },
  } as unknown as TestContext['pages']['useCaseSelector'];

  const result = await selectFirstUseCase().execute(createContext(selector));

  expect(calls).toEqual(['open', 'select-first', 'close']);
  expect(result).toBe('first available use case');
});

test('selectAllUseCases closes the selector after selection', async () => {
  const calls: string[] = [];
  const selector = {
    close: () => {
      calls.push('close');
      return Promise.resolve();
    },
    open: () => {
      calls.push('open');
      return Promise.resolve();
    },
    selectAll: () => {
      calls.push('select-all');
      return Promise.resolve();
    },
  } as unknown as TestContext['pages']['useCaseSelector'];

  await selectAllUseCases().execute(createContext(selector));

  expect(calls).toEqual(['open', 'select-all', 'close']);
});

test('filterAndSelectUseCase extends the selector command surface', async () => {
  const calls: string[] = [];
  const selector = {
    close: () => {
      calls.push('close');
      return Promise.resolve();
    },
    filter: (query: string) => {
      calls.push(`filter:${query}`);
      return Promise.resolve();
    },
    open: () => {
      calls.push('open');
      return Promise.resolve();
    },
    options: () => undefined,
    select: (value: string) => {
      calls.push(`select:${value}`);
      return Promise.resolve();
    },
    selectFirst: () => {
      calls.push('select-first');
      return Promise.resolve('unused');
    },
  } as unknown as TestContext['pages']['useCaseSelector'];

  const result = await filterAndSelectUseCase({query: 'voice call'}).execute(
    createContext(selector),
  );

  expect(calls).toEqual(['open', 'filter:voice call', 'select-first', 'close']);
  expect(result).toBe('unused');
});

test('selector scopes options, filters them, and asserts selected state', async ({
  page,
}) => {
  await page.setContent(`
    <main>
      <div data-combobox-root>
        <input aria-controls="use-case-list" aria-label="Search for usecases">
        <button onclick="this.closest('[data-combobox-root]').hidden = true">Done</button>
        <button aria-controls="use-case-list" aria-expanded="false">Expand Default</button>
        <div hidden id="use-case-list">
          <label><input aria-label="Select Active" type="checkbox">Active</label>
          <label><input aria-label="Select Inactive" type="checkbox">Inactive</label>
          <label><input aria-label="Select Diff/Merge" type="checkbox">Diff/Merge</label>
        </div>
      </div>
      <label><input aria-label="Unrelated checkbox" type="checkbox">Unrelated option</label>
    </main>
    <script>
      const input = document.querySelector('[aria-label="Search for usecases"]');
      const list = document.querySelector('#use-case-list');
      const options = [...list.querySelectorAll('label')];
      document.querySelector('button[aria-controls="use-case-list"]').addEventListener('click', () => {
        list.hidden = false;
      });
      input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        options.forEach((option) => {
          option.hidden = !option.textContent.toLowerCase().includes(query);
        });
      });
    </script>
  `);

  const selector = createUseCaseSelector(page);

  await selector.open();
  await selector.filter('Inactive');

  const selected = await selector.selectFirst();

  expect(selected).toBe('Inactive');
  await expect(selector.options()).toHaveCount(1);
  await expect(selector.options().first()).toBeChecked();

  await selector.close();
  await expect(page.locator('[data-combobox-root]')).toBeHidden();
});
