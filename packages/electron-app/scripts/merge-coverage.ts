/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const rootDir = resolve(import.meta.dirname, '../../..');
const combinedDir = resolve(rootDir, 'coverage/combined');
const electronDir = resolve(rootDir, 'coverage/electron-app');
const e2eResultsDir = resolve(rootDir, 'packages/electron-app/test-results');
const reactCoverageJson = resolve(
  rootDir,
  'coverage/react-app/coverage-final.json',
);
const nycBin = resolve(
  rootDir,
  'packages/electron-app/node_modules/nyc/bin/nyc.js',
);

export function getCoverageMode(args: string[]): 'all' | 'electron-only' {
  return args.includes('--electron-only') ? 'electron-only' : 'all';
}

export function getCoverageCleanupPaths(
  mode: 'all' | 'electron-only',
): string[] {
  return mode === 'all'
    ? ['coverage/react-app', 'coverage/electron-app', 'coverage/combined']
    : ['coverage/electron-app'];
}

export function getCoverageInputFiles(directory: string): string[] {
  return readdirSync(directory, {withFileTypes: true})
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith('coverage-') &&
        entry.name.endsWith('.json'),
    )
    .map((entry) => resolve(directory, entry.name))
    .sort();
}

function runNyc(args: string[]): void {
  const result = spawnSync(process.execPath, [nycBin, ...args], {
    cwd: rootDir,
    stdio: 'inherit',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`nyc exited with status ${result.status ?? 'unknown'}`);
  }
}

export function mergeCoverageFiles(
  inputFiles: string[],
  outputFile: string,
): void {
  const inputDirectory = mkdtempSync(join(tmpdir(), 'istanbul-input-'));
  try {
    for (const [index, inputFile] of inputFiles.entries()) {
      copyFileSync(inputFile, join(inputDirectory, `${index}.json`));
    }
    runNyc(['merge', inputDirectory, outputFile]);
  } finally {
    rmSync(inputDirectory, {force: true, recursive: true});
  }
}

export function writeReport(
  coverageFile: string,
  reportDirectory: string,
): void {
  const tempDirectory = resolve(reportDirectory, '.nyc_output');
  mkdirSync(tempDirectory, {recursive: true});
  copyFileSync(coverageFile, resolve(tempDirectory, 'coverage.json'));
  runNyc([
    'report',
    '--reporter=html',
    '--reporter=text-summary',
    '--temp-dir',
    tempDirectory,
    '--report-dir',
    reportDirectory,
  ]);
}

function cleanCoverageArtifacts(mode: 'all' | 'electron-only'): void {
  for (const relativePath of getCoverageCleanupPaths(mode)) {
    rmSync(resolve(rootDir, relativePath), {force: true, recursive: true});
  }

  if (existsSync(e2eResultsDir)) {
    for (const inputFile of getCoverageInputFiles(e2eResultsDir)) {
      rmSync(inputFile, {force: true});
    }
  }
}

function cleanReportDirectories(mode: 'all' | 'electron-only'): void {
  const reportDirectories =
    mode === 'all' ? [electronDir, combinedDir] : [electronDir];
  for (const reportDirectory of reportDirectories) {
    rmSync(reportDirectory, {force: true, recursive: true});
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const mode = getCoverageMode(args);
  if (args.includes('--prepare')) {
    cleanCoverageArtifacts(mode);
    return;
  }
  cleanReportDirectories(mode);
  if (mode === 'all') {
    mkdirSync(combinedDir, {recursive: true});
  }
  mkdirSync(electronDir, {recursive: true});

  const e2eInputFiles = existsSync(e2eResultsDir)
    ? getCoverageInputFiles(e2eResultsDir)
    : [];
  const e2eCoverageJson = resolve(electronDir, 'coverage-final.json');

  if (e2eInputFiles.length > 0) {
    mergeCoverageFiles(e2eInputFiles, e2eCoverageJson);
    writeReport(e2eCoverageJson, electronDir);
  }

  if (
    mode === 'all' &&
    existsSync(reactCoverageJson) &&
    existsSync(e2eCoverageJson)
  ) {
    const combinedCoverageJson = resolve(combinedDir, 'coverage-final.json');
    mergeCoverageFiles(
      [reactCoverageJson, e2eCoverageJson],
      combinedCoverageJson,
    );
    writeReport(combinedCoverageJson, combinedDir);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
