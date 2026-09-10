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
import {promises as fs} from 'node:fs';
import {resolve} from 'node:path';

import type {TestCommand} from './command';
import {CommandRunner} from './command-runner';
import {
  installOpenProjectFileSeam,
  type OpenProjectFileResponse,
} from './open-project-file';
import {
  loadTestInputs,
  resolveTestData,
  type TestInputOverrides,
} from './test-data';
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

const testCaseAnnotationType = 'audioreach-test-case';

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

export async function captureCoverage(
  page: Page,
  testInfo: TestInfo,
): Promise<void> {
  const coverage = await page.evaluate(
    () => (window as Window & {__coverage__?: unknown}).__coverage__,
  );
  if (!coverage) {
    return;
  }

  const coveragePath = resolve(`test-results/coverage-${testInfo.testId}.json`);
  await fs.mkdir(resolve('test-results'), {recursive: true});
  await fs.writeFile(coveragePath, JSON.stringify(coverage));

  await testInfo.attach('coverage', {
    body: JSON.stringify(coverage),
    contentType: 'application/json',
  });
}

export function getTestData(overrides: TestInputOverrides = {}): TestData {
  return {
    customInputs: {},
    rejectedProjectPath: defaultRejectedProjectPath,
    useCaseQuery: '',
    validOpenProjectPath: defaultValidOpenProjectPath,
    workspacePath: defaultValidOpenProjectPath,
    ...overrides,
  };
}

export const testSession = base.extend<{testSession: TestSession}>({
  testSession: async ({playwright: _playwright}, use, testInfo: TestInfo) => {
    const inputsPath = fileURLToPath(
      new URL('../data/inputs.json', import.meta.url),
    );
    const inputs = await loadTestInputs(inputsPath);
    const caseId = testInfo.annotations.find(
      (annotation) => annotation.type === testCaseAnnotationType,
    )?.description;
    const app = await launchTestApp();
    let page: Page | undefined;
    let testError: unknown;
    let failed = false;
    const seamDisposers: Array<() => Promise<void>> = [];
    let openProjectFileSeamInstalled = false;
    let openProjectFileResponse: OpenProjectFileResponse | undefined;
    let automaticSeamDisposer: (() => Promise<void>) | undefined;
    let automaticSeamWorkspacePath: string | undefined;
    let explicitSeamResponse: OpenProjectFileResponse | undefined;

    try {
      page = await getFirstWindow(app);
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
        testData: resolveTestData(getTestData(), inputs, caseId, inputsPath),
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

    if (page) {
      try {
        await captureCoverage(page, testInfo);
      } catch (error) {
        if (!failed) {
          failed = true;
          testError = error;
        }
      }
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

export function testCase(id: string): {
  readonly annotation: {readonly description: string; readonly type: string};
} {
  return {
    annotation: {description: id, type: testCaseAnnotationType},
  };
}
