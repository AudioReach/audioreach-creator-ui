/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {CommandFactory} from '../../framework/command';

export const selectAllUseCases: CommandFactory<void, void> = () => ({
  execute: async (context) => {
    await context.pages.useCaseSelector.open();
    await context.pages.useCaseSelector.selectAll();
    await context.pages.useCaseSelector.close();
  },
  id: 'home.select-all-use-cases',
});

export const selectFirstUseCase: CommandFactory<void, string> = () => ({
  execute: async (context) => {
    await context.pages.useCaseSelector.open();
    const selected = await context.pages.useCaseSelector.selectFirst();
    await context.pages.useCaseSelector.close();
    return selected;
  },
  id: 'home.select-first-use-case',
});

export const filterAndSelectUseCase: CommandFactory<
  {readonly query: string},
  string
> = (input) => ({
  execute: async (context) => {
    await context.pages.useCaseSelector.open();
    await context.pages.useCaseSelector.filter(input.query);
    const selected = await context.pages.useCaseSelector.selectFirst();
    await context.pages.useCaseSelector.close();
    return selected;
  },
  id: 'home.filter-and-select-use-case',
});
