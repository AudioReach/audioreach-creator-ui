/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {_electron as electron} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// TODO: https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci
export async function getTestApp() {
  const packageDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  );

  return electron.launch({
    args: [path.join(packageDir, 'dist', 'main.cjs')],
    bypassCSP: true,
  });
}
