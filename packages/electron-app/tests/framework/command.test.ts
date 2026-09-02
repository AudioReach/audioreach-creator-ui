/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect, test} from '@playwright/test';
import type {CommandFactory, TestCommand} from './command';
import type {TestContext, TestData} from './test-context';

type Result =
  | {readonly message: string; readonly ok: false}
  | {readonly ok: true; readonly value: string};

test('commands preserve stable IDs and narrow discriminated outputs', async () => {
  const command: TestCommand<Result> = {
    execute: () => Promise.resolve({ok: true, value: 'ready'}),
    id: 'project.open',
  };

  expect(command.id).toBe('project.open');
  const result = await command.execute({} as TestContext);
  if (result.ok) {
    expect(result.value).toBe('ready');
  } else {
    expect(result.message).toBeTruthy();
  }
});

test('command factories preserve input and output types', () => {
  const factory: CommandFactory<{readonly path: string}, number> = (input) => ({
    execute: () => Promise.resolve(input.path.length),
    id: 'project.path-length',
  });

  expect(factory({path: '/tmp/project'}).id).toBe('project.path-length');

  const command: TestCommand<number> = factory({path: '/tmp/project'});
  expect(command.id).toBe('project.path-length');
});

test('test data is stable and JSON serializable', () => {
  const testData: TestData = {
      customInputs: {},
      rejectedProjectPath: '/tmp/rejected-project',
      useCaseQuery: 'voice call',
      validOpenProjectPath: '/tmp/valid-open-project',
      workspacePath: '/tmp/workspace',
  };

  expect(JSON.parse(JSON.stringify(testData))).toEqual(testData);
});

const stringFactory: CommandFactory<string, number> = (input) => ({
  execute: () => Promise.resolve(input.length),
  id: 'invalid.input',
});

// @ts-expect-error A command factory must reject mismatched input types.
stringFactory(42);

const invalidOutputCommand: TestCommand<number> = {
  // @ts-expect-error A command output must match the declared output type.
  execute: () => Promise.resolve('not a number'),
  id: 'invalid.output',
};

void invalidOutputCommand;
