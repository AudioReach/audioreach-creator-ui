/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {expect, test} from '@playwright/test';
import {redactSecrets} from './redaction';

test('redacts sensitive keys recursively while preserving safe diagnostics', () => {
  const value = {
    credentials: {password: 'pass', username: 'user'},
    fileContents: 'private file data',
    nested: [{accessToken: 'token'}, {result: 'ok'}],
    safe: 'visible',
  };

  expect(redactSecrets(value)).toEqual({
    credentials: '[REDACTED]',
    fileContents: '[REDACTED]',
    nested: [{accessToken: '[REDACTED]'}, {result: 'ok'}],
    safe: 'visible',
  });
});

test('redaction leaves primitive diagnostics unchanged', () => {
  expect(redactSecrets(null)).toBeNull();
  expect(redactSecrets('safe')).toBe('safe');
  expect(redactSecrets(42)).toBe(42);
});
