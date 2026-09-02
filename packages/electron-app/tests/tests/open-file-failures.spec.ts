/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect} from '@playwright/test';
import {openFile} from '../commands/home';
import {testSession} from '../framework';

testSession.describe('@negative', () => {
  testSession(
    'EX-1b reports backend rejection and clears loading',
    async ({testSession}) => {
      const responsePromise = testSession.page.waitForResponse((response) =>
        response.url().endsWith('/projects/offline/upload-files'),
      );

      const result = await testSession.run(
        openFile({workspacePath: testSession.testData.rejectedProjectPath}),
      );
      const response = await responsePromise;
      const body = (await response.json()) as {readonly success?: boolean};

      expect(response.status() >= 400 || body.success === false).toBe(true);
      expect(result.ok).toBe(false);
      expect(result.message).toBeTruthy();
      const notificationRegion = testSession.page.getByRole('region', {
        name: 'top-end Notifications',
      });
      const notification = notificationRegion.getByText(/\S+/).first();
      await expect(notification).toBeVisible();
      expect((await notification.textContent())?.trim()).toBeTruthy();
      await expect(
        testSession.page.getByText('Opening file picker...'),
      ).not.toBeVisible();
    },
  );

  testSession(
    'EX-1c cancels without uploading or showing danger toast',
    async ({testSession}) => {
      await testSession.installOpenProjectFileSeam({cancelled: true});
      const uploadRequests: string[] = [];
      testSession.page.on('request', (request) => {
        if (request.url().endsWith('/projects/offline/upload-files')) {
          uploadRequests.push(request.url());
        }
      });

      const result = await testSession.run(
        openFile({workspacePath: testSession.testData.rejectedProjectPath}),
      );

      expect(result).toEqual({
        message: 'File selection cancelled',
        ok: false,
      });
      expect(uploadRequests).toHaveLength(0);
      await expect(
        testSession.page.getByText('Opening file picker...'),
      ).not.toBeVisible();
      await expect(
        testSession.page.getByText('File selection cancelled'),
      ).toHaveCount(0);
    },
  );
});
