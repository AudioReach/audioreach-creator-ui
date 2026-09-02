/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  expect,
  test,
  type ElectronApplication,
  type Page,
  type TestInfo,
} from '@playwright/test';

import {CommandError} from './errors';
import {CommandRunner} from './command-runner';
import {click} from '../commands/app/interactions';
import {
  closeTestApp,
  getTestData,
  getFirstWindow,
  launchTestApp,
} from './fixtures';
import type {PageObjects} from './test-context';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

test('launchTestApp preserves launch failures', async () => {
  const cause = new Error('launch failed');

  await expect(
    launchTestApp(() => Promise.reject(cause)),
  ).rejects.toBe(cause);
});

test('getTestData resolves the repository workspace fixture path', () => {
  expect(getTestData({}).validOpenProjectPath).toBe(
    fileURLToPath(
      new URL('../fixtures/valid-open-project/workspaceFileXml.awsp', import.meta.url),
    ),
  );
});

test('getTestData default path does not depend on process CWD', () => {
  const currentDirectory = process.cwd();

  try {
    process.chdir(tmpdir());
    expect(getTestData({}).validOpenProjectPath).toBe(
      fileURLToPath(
        new URL('../fixtures/valid-open-project/workspaceFileXml.awsp', import.meta.url),
      ),
    );
  } finally {
    process.chdir(currentDirectory);
  }
});

test('getTestData preserves an environment workspace override', () => {
  const override = 'portable-temp/workspaceFileXml.awsp';

  expect(
    getTestData({E2E_VALID_OPEN_PROJECT_PATH: override}).validOpenProjectPath,
  ).toBe(override);
});

test('getTestData preserves an environment rejected-project override', () => {
  const override = 'portable-temp/rejected-workspace.awsp';

  expect(
    getTestData({E2E_REJECTED_PROJECT_PATH: override}).rejectedProjectPath,
  ).toBe(override);
});

test('getFirstWindow rejects missing application windows', async () => {
  const app = {
    firstWindow: () => Promise.resolve(undefined),
  } as unknown as ElectronApplication;

  await expect(getFirstWindow(app)).rejects.toThrow(
    'Electron application did not open a window',
  );
});

test('closeTestApp closes the app and preserves an earlier failure', async () => {
  const app = {
    close: () => Promise.reject(new Error('teardown failed')),
  } as unknown as ElectronApplication;
  const testError = new Error('test failed');

  await expect(closeTestApp(app, testError)).resolves.toBe(testError);
});

test('closeTestApp reports teardown failure when no test failed', async () => {
  const app = {
    close: () => Promise.reject(new Error('teardown failed')),
  } as unknown as ElectronApplication;

  await expect(closeTestApp(app, undefined)).rejects.toThrow('teardown failed');
});

test('CommandRunner names the step and attaches safe command metadata', async () => {
  const cause = new Error('command failed');
  const attachments: Array<{
    body: string;
    contentType?: string;
    name: string;
  }> = [];
  let stepName: string | undefined;
  const testInfo = {
    attach: (
      name: string,
      attachment: {body: string; contentType?: string},
    ) => {
      attachments.push({...attachment, name});
      return Promise.resolve();
    },
  } as unknown as TestInfo;
  const page = {} as Page;
  const context = {
    app: {} as ElectronApplication,
    getOpenProjectFileResponse: () => undefined,
    hasOpenProjectFileSeam: () => false,
    installOpenProjectFileSeam: () =>
      Promise.resolve(() => new Promise<void>((resolve) => resolve())),
    page,
    pages: {} as PageObjects,
    testData: {
      moduleNodeId: 'module-1',
      rejectedProjectPath: '/tmp/rejected-project',
      useCaseQuery: 'voice call',
      validOpenProjectPath: '/tmp/valid-open-project',
      workspacePath: '/tmp/workspace',
    },
    testInfo,
  };
  const runnerWithContext = new CommandRunner(testInfo, context, async (name, body) => {
    stepName = name;
    return test.step(name, body);
  });

  let error: unknown;

  try {
    await runnerWithContext.run({
      execute: () => Promise.reject(cause),
      id: 'project.open',
    });
  } catch (caughtError) {
    error = caughtError;
  }

  expect(error).toBeInstanceOf(CommandError);
  expect((error as CommandError).commandId).toBe('project.open');
  expect((error as CommandError).cause).toBe(cause);
  expect(stepName).toBe('project.open');
  expect(attachments).toEqual([
    {
      body: JSON.stringify({commandId: 'project.open'}),
      contentType: 'application/json',
      name: 'command-metadata',
    },
  ]);
});

test('CommandRunner preserves native Playwright assertion failures', async () => {
  const assertionError = Object.assign(new Error('expected text'), {
    matcherResult: {message: 'expected text'},
  });
  const testInfo = {attach: () => Promise.resolve()} as unknown as TestInfo;
  const context = {
    app: {} as ElectronApplication,
    getOpenProjectFileResponse: () => undefined,
    hasOpenProjectFileSeam: () => false,
    installOpenProjectFileSeam: () =>
      Promise.resolve(() => new Promise<void>((resolve) => resolve())),
    page: {} as Page,
    pages: {} as PageObjects,
    testData: getTestData({}),
    testInfo,
  };

  await expect(
    new CommandRunner(testInfo, context).run({
      execute: () => Promise.reject(assertionError),
      id: 'project.assertion',
    }),
  ).rejects.toBe(assertionError);
});

test('CommandRunner preserves native locator action timeout diagnostics', async ({
  page,
}) => {
  await page.setContent('<button>Present</button>');
  page.setDefaultTimeout(1);
  const testInfo = {attach: () => Promise.resolve()} as unknown as TestInfo;
  const context = {
    app: {} as ElectronApplication,
    getOpenProjectFileResponse: () => undefined,
    hasOpenProjectFileSeam: () => false,
    installOpenProjectFileSeam: () =>
      Promise.resolve(() => new Promise<void>((resolve) => resolve())),
    page,
    pages: {} as PageObjects,
    testData: getTestData({}),
    testInfo,
  };

  let error: unknown;
  try {
    await new CommandRunner(testInfo, context).run(
      click({
        target: (currentContext) =>
          currentContext.page.getByRole('button', {name: 'Missing'}),
        targetDescription: 'missing button',
      }),
    );
  } catch (caughtError) {
    error = caughtError;
  }

  expect(error).not.toBeInstanceOf(CommandError);
  expect(error).toHaveProperty('name', 'TimeoutError');
  expect(error).toHaveProperty(
    'message',
    expect.stringContaining('Missing'),
  );
});
