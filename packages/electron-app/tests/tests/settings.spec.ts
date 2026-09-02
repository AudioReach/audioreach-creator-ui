/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';

import {openFile} from '../commands/home';
import {expandSideNav} from '../commands/navigation';
import {toggleTheme} from '../commands/settings';
import {testSession} from '../framework';

testSession('EX-2 toggles the application theme', async ({testSession}) => {
  const result = await testSession.run(
    openFile({workspacePath: testSession.testData.validOpenProjectPath}),
  );
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.project.projectId).toBeTruthy();
  }
  await testSession.run(expandSideNav());
  await testSession.pages.settings.open();

  const initialTheme = await testSession.pages.settings.rootTheme();
  const nextTheme = await testSession.run(toggleTheme());

  expect(['dark', 'light']).toContain(nextTheme);
  expect(nextTheme).not.toBe(initialTheme);
});
