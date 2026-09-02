/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';

import {
  openFile,
  filterAndSelectUseCase,
  selectAllUseCases,
} from '../commands/home';
import {testCase, testSession} from '../framework';

testSession('EX-3 selects all the available use cases', async ({testSession}) => {
  const opened = await testSession.run(
    openFile({workspacePath: testSession.testData.validOpenProjectPath}),
  );
  expect(opened.ok).toBe(true);

  await testSession.run(selectAllUseCases());
});

testSession(
  'EX-4 filters and selects the first use case from the list',
  testCase('use-case-filter'),
  async ({testSession}) => {
    const opened = await testSession.run(
      openFile({workspacePath: testSession.testData.validOpenProjectPath}),
    );
    expect(opened.ok).toBe(true);

    const selected = await testSession.run(
      filterAndSelectUseCase({query: testSession.testData.useCaseQuery}),
    );

    expect(selected).not.toHaveLength(0);
  },
);
