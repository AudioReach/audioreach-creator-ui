/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ElectronApplication, Page, TestInfo} from '@playwright/test';

import type {HomePage} from '../pages/home-page';
import type {GraphPage} from '../pages/graph-page';
import type {SideNav} from '../pages/side-nav';
import type {SettingsPanel} from '../pages/settings-panel';
import type {UseCaseSelector} from '../pages/use-case-selector';
import type {OpenProjectFileResponse} from './open-project-file';

export type TestData = {
  readonly customInputs: JsonObject;
  readonly rejectedProjectPath: string;
  readonly useCaseQuery: string;
  readonly validOpenProjectPath: string;
  readonly workspacePath: string;
};

export type JsonObject = {
  readonly [key: string]: JsonValue;
};

export type JsonValue =
  | boolean
  | JsonObject
  | JsonValue[]
  | null
  | number
  | string;

export interface PageObjects {
  readonly graph: GraphPage;
  readonly home: HomePage;
  readonly settings: SettingsPanel;
  readonly sideNav: SideNav;
  readonly useCaseSelector: UseCaseSelector;
}

export type TestContext = {
  readonly app: ElectronApplication;
  readonly ensureOpenProjectFileSeam: (
    workspacePath: string,
    responseFactory: () => Promise<OpenProjectFileResponse>,
  ) => Promise<void>;
  readonly getOpenProjectFileResponse: () =>
    OpenProjectFileResponse | undefined;
  readonly hasOpenProjectFileSeam: () => boolean;
  readonly installOpenProjectFileSeam: (
    response: OpenProjectFileResponse,
  ) => Promise<() => Promise<void>>;
  readonly page: Page;
  readonly pages: PageObjects;
  readonly testData: TestData;
  readonly testInfo: TestInfo;
};
