/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {join} from 'node:path';

import {expect, test} from '@playwright/test';

import {getTestData} from './fixtures';
import {
  loadTestInputs,
  parseTestInputs,
  resolveTestData,
  type TestInputs,
} from './test-data';

test('test inputs merge defaults with a case override', () => {
  const inputs: TestInputs = {
    cases: {
      'module-selection': {
        customInputs: {graph: {moduleLabel: 'Data Logging'}},
        useCaseQuery: 'Tuning',
      },
    },
    defaults: {
      useCaseQuery: 'Voice',
      validOpenProjectPath: 'fixtures/valid-open-project/workspaceFileXml.awsp',
    },
  };

  expect(
    resolveTestData(
      getTestData(),
      inputs,
      'module-selection',
      '/repo/packages/electron-app/tests/data/inputs.json',
    ),
  ).toMatchObject({
    customInputs: {graph: {moduleLabel: 'Data Logging'}},
    useCaseQuery: 'Tuning',
    validOpenProjectPath: join(
      '/repo/packages/electron-app/tests',
      'fixtures/valid-open-project/workspaceFileXml.awsp',
    ),
  });
});

test('test inputs keep global defaults when a case has no override', () => {
  const inputs: TestInputs = {
    cases: {},
    defaults: {useCaseQuery: 'Voice'},
  };

  expect(
    resolveTestData(
      getTestData(),
      inputs,
      undefined,
      '/repo/packages/electron-app/tests/data/inputs.json',
    ).useCaseQuery,
  ).toBe('Voice');
});

test('test inputs reject unknown fields', () => {
  expect(() =>
    parseTestInputs({
      defaults: {unknown: 'value'},
    }),
  ).toThrow('Unknown test input "unknown"');
});

test('test inputs reject malformed case data', () => {
  expect(() =>
    parseTestInputs({
      cases: {first: 'not an object'},
    }),
  ).toThrow('Test input case "first" must be an object');
});

test('test inputs report a missing file clearly', async () => {
  await expect(loadTestInputs('/missing/inputs.json')).rejects.toThrow(
    'Unable to read test inputs file: /missing/inputs.json',
  );
});

test('test inputs recursively merge custom feature payloads', () => {
  const inputs: TestInputs = {
    cases: {
      'module-instance-selection': {
        customInputs: {
          graph: {moduleInstanceId: '0xA20000D5'},
        },
      },
    },
    defaults: {
      customInputs: {
        graph: {moduleLabel: 'Data Logging'},
      },
    },
  };

  expect(
    resolveTestData(
      getTestData(),
      inputs,
      'module-instance-selection',
      '/repo/packages/electron-app/tests/data/inputs.json',
    ).customInputs,
  ).toEqual({
    graph: {
      moduleInstanceId: '0xA20000D5',
      moduleLabel: 'Data Logging',
    },
  });
});
