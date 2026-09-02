/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';

import {openFile, showHomeControls} from '../commands/home';
import {openAbout, expandSideNav} from '../commands/navigation';
import {testSession} from '../framework';

testSession.describe('@smoke', () => {
  testSession(
    'Renders Start Page with Projects and Devices buttons',
    async ({testSession}) => {
      await testSession.run(showHomeControls());
    },
  );

  testSession(
    'Shows navigation buttons and controls',
    async ({testSession}) => {
      await testSession.run(showHomeControls());
    },
  );

  testSession('Clicking About menu item shows toast', async ({testSession}) => {
    await testSession.run(expandSideNav());
    await testSession.run(openAbout());
  });

  testSession(
    '@sanity Opens a valid workspace file through the real backend',
    async ({testSession}) => {
      const result = await testSession.run(
        openFile({workspacePath: testSession.testData.validOpenProjectPath}),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.project.projectId).toBeTruthy();
      }
      await expect(
        testSession.page.getByText('Opening file picker...'),
      ).not.toBeVisible();
      await expect(
        testSession.page.getByText('Project opened successfully'),
      ).toBeVisible();
    },
  );
});
