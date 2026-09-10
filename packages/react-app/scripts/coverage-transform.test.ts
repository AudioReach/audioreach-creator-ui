/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {resolve} from 'node:path';

import {createCoveragePlugin} from './coverage-transform.ts';

void test('instruments source with the shared Babel pipeline', () => {
  const plugin = createCoveragePlugin(true);
  const result = plugin.transform?.(
    'export function value(input: number) { return input + 1; }',
    resolve(import.meta.dirname, '../src/example.ts'),
  );

  assert.ok(result);
  assert.match(result.code, /export function value/);
  assert.match(result.code, /__coverage__/);
  assert.ok(result.map);
});
