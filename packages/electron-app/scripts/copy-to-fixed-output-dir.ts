/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import fs from 'fs-extra';
import {resolve} from 'node:path';
import type {AfterPackContext} from 'electron-builder';

/**
 * electron-builder names its --dir output by platform (out/win-unpacked,
 * out/linux-unpacked, out/mac). Copies that platform-specific folder into a
 * single fixed location at the repo root so downstream tooling (e.g. the
 * Electron client's "backend binaries location" config, or any packaging
 * script) can point at one path regardless of which OS produced the build.
 */
export async function copyToFixedOutputDir(
  context: AfterPackContext,
): Promise<void> {
  const targetDir = resolve(context.packager.projectDir, '..', '..', 'dist');

  console.log(
    `📦 Copying packaged app from ${context.appOutDir} to ${targetDir}`,
  );

  await fs.remove(targetDir);
  await fs.copy(context.appOutDir, targetDir);

  console.log(`✅ Packaged app available at: ${targetDir}`);
}
