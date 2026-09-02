/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  test as base,
  type ElectronApplication,
  type Page,
  type TestInfo,
} from '@playwright/test';
import {fileURLToPath} from 'node:url';

import type {TestCommand} from './command';
import {CommandRunner} from './command-runner';
import {
  installOpenProjectFileSeam,
  type OpenProjectFileResponse,
} from './open-project-file';
import {createGraphPage} from '../pages/graph-page';
import {createHomePage} from '../pages/home-page';
import {createSideNav} from '../pages/side-nav';
import {createSettingsPanel} from '../pages/settings-panel';
import {createUseCaseSelector} from '../pages/use-case-selector';
import {getTestApp} from '../utils';
import type {TestContext, TestData} from './test-context';

export type TestSession = TestContext & {
  readonly run: <TOutput>(command: TestCommand<TOutput>) => Promise<TOutput>;
};

type AppLauncher = () => Promise<ElectronApplication>;

const defaultValidOpenProjectPath = fileURLToPath(
  new URL(
    '../fixtures/valid-open-project/workspaceFileXml.awsp',
    import.meta.url,
  ),
);
const defaultRejectedProjectPath = fileURLToPath(
  new URL(
    '../fixtures/rejected-open-project/workspaceFileXml.awsp',
    import.meta.url,
  ),
);

export async function launchTestApp(
  launcher: AppLauncher = getTestApp,
): Promise<ElectronApplication> {
  return launcher();
}

export async function getFirstWindow(app: ElectronApplication): Promise<Page> {
  const page = await app.firstWindow();

  if (!page) {
    throw new Error('Electron application did not open a window');
  }

  return page;
}

export async function closeTestApp(
  app: ElectronApplication,
  testError: unknown,
): Promise<unknown> {
  try {
    await app.close();
  } catch (teardownError) {
    if (testError !== undefined) {
      return testError;
    }

    throw teardownError;
  }

  return testError;
}

export function getTestData(
  environment: NodeJS.ProcessEnv = process.env,
): TestData {
  return {
    moduleNodeId: environment.E2E_MODULE_NODE_ID,
    rejectedProjectPath:
      environment.E2E_REJECTED_PROJECT_PATH ?? defaultRejectedProjectPath,
    useCaseQuery: environment.E2E_USE_CASE_QUERY ?? 'Active',
    validOpenProjectPath:
      environment.E2E_VALID_OPEN_PROJECT_PATH ?? defaultValidOpenProjectPath,
    workspacePath:
      environment.E2E_WORKSPACE_PATH ?? defaultValidOpenProjectPath,
  };
}

export const testSession = base.extend<{testSession: TestSession}>({
  testSession: async ({playwright: _playwright}, use, testInfo: TestInfo) => {
    const app = await launchTestApp();
    let testError: unknown;
    let failed = false;
    const seamDisposers: Array<() => Promise<void>> = [];
    let openProjectFileSeamInstalled = false;
    let openProjectFileResponse: OpenProjectFileResponse | undefined;
    let automaticSeamDisposer: (() => Promise<void>) | undefined;
    let automaticSeamWorkspacePath: string | undefined;
    let explicitSeamResponse: OpenProjectFileResponse | undefined;

    try {
      const page = await getFirstWindow(app);
      const registerSeam = async (
        response: OpenProjectFileResponse,
      ): Promise<() => Promise<void>> => {
        const dispose = await installOpenProjectFileSeam(app, response);
        let disposed = false;
        const managedDispose = async () => {
          if (disposed) {
            return;
          }
          disposed = true;
          await dispose();
          if (openProjectFileResponse === response) {
            openProjectFileSeamInstalled = false;
            openProjectFileResponse = undefined;
          }
          if (explicitSeamResponse === response) {
            explicitSeamResponse = undefined;
          }
          if (automaticSeamDisposer === managedDispose) {
            automaticSeamDisposer = undefined;
            automaticSeamWorkspacePath = undefined;
          }
        };
        seamDisposers.push(managedDispose);
        openProjectFileSeamInstalled = true;
        openProjectFileResponse = response;
        return managedDispose;
      };
      const context: TestContext = {
        app,
        ensureOpenProjectFileSeam: async (workspacePath, responseFactory) => {
          if (explicitSeamResponse) {
            return;
          }
          if (automaticSeamWorkspacePath === workspacePath) {
            return;
          }
          await automaticSeamDisposer?.();
          const response = await responseFactory();
          automaticSeamDisposer = await registerSeam(response);
          automaticSeamWorkspacePath = workspacePath;
        },
        getOpenProjectFileResponse: () => openProjectFileResponse,
        hasOpenProjectFileSeam: () => openProjectFileSeamInstalled,
        installOpenProjectFileSeam: async (response) => {
          await automaticSeamDisposer?.();
          automaticSeamDisposer = undefined;
          automaticSeamWorkspacePath = undefined;
          const managedDispose = await registerSeam(response);
          explicitSeamResponse = response;
          return managedDispose;
        },
        page,
        pages: {
          graph: createGraphPage(page),
          home: createHomePage(page),
          settings: createSettingsPanel(page),
          sideNav: createSideNav(page),
          useCaseSelector: createUseCaseSelector(page),
        },
        testData: getTestData(),
        testInfo,
      };
      const runner = new CommandRunner(testInfo, context);

      await use({
        ...context,
        run: <TOutput>(command: TestCommand<TOutput>) => runner.run(command),
      });
    } catch (error) {
      failed = true;
      testError = error;
    }

    for (const disposeOpenProjectFileSeam of seamDisposers.reverse()) {
      try {
        await disposeOpenProjectFileSeam();
      } catch (error) {
        if (!failed) {
          failed = true;
          testError = error;
        }
      }
    }

    const error = await closeTestApp(app, failed ? testError : undefined);

    if (failed) {
      throw error;
    }
  },
});
