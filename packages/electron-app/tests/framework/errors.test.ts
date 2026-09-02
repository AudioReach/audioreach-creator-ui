/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect, test} from '@playwright/test';
import {CommandError} from './errors';

test('CommandError preserves its command ID, safe metadata, and cause', () => {
  const cause = new Error('backend failed');
  const error = new CommandError('project.open', {attempt: 2}, cause);

  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe('CommandError');
  expect(error.commandId).toBe('project.open');
  expect(error.metadata).toEqual({attempt: 2});
  expect(error.cause).toBe(cause);
});

test('CommandError redacts sensitive metadata before attaching diagnostics', () => {
  const error = new CommandError(
    'backend.start',
    {
      backendSecret: 'secret',
      password: 'password',
      safe: 'visible',
    },
    new Error('failed'),
  );

  expect(error.metadata).toEqual({
    backendSecret: '[REDACTED]',
    password: '[REDACTED]',
    safe: 'visible',
  });
});
