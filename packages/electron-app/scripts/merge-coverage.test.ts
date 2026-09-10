/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {strict as assert} from 'node:assert';
import {existsSync} from 'node:fs';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import {
  getCoverageCleanupPaths,
  getCoverageInputFiles,
  getCoverageMode,
  mergeCoverageFiles,
  writeReport,
} from './merge-coverage.ts';

function fileCoverage(path: string) {
  return {
    [path]: {
      b: {},
      branchMap: {},
      f: {},
      fnMap: {},
      path,
      s: {},
      statementMap: {},
    },
  };
}

void test('selects Electron-only mode from the command line', () => {
  assert.equal(getCoverageMode(['--electron-only']), 'electron-only');
});

void test('defaults to generating all coverage reports', () => {
  assert.equal(getCoverageMode([]), 'all');
});

void test('cleans all app reports before a root run', () => {
  assert.deepEqual(getCoverageCleanupPaths('all'), [
    'coverage/react-app',
    'coverage/electron-app',
    'coverage/combined',
  ]);
});

void test('cleans only Electron coverage before a filtered run', () => {
  assert.deepEqual(getCoverageCleanupPaths('electron-only'), [
    'coverage/electron-app',
  ]);
});

void test('selects Istanbul coverage files without Playwright result files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'merge-coverage-'));
  await writeFile(join(directory, 'coverage-test.json'), '{}');
  await writeFile(join(directory, 'results.json'), '{}');
  await writeFile(join(directory, 'coverage.txt'), '{}');

  assert.deepEqual(getCoverageInputFiles(directory), [
    join(directory, 'coverage-test.json'),
  ]);
});

void test('merges Istanbul coverage files into one report', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'merge-coverage-input-'));
  const inputA = join(directory, 'a.json');
  const inputB = join(directory, 'b.json');
  const outputFile = join(directory, 'merged.json');
  await writeFile(inputA, JSON.stringify(fileCoverage('/src/a.ts')));
  await writeFile(inputB, JSON.stringify(fileCoverage('/src/b.ts')));

  mergeCoverageFiles([inputA, inputB], outputFile);

  assert.ok(existsSync(outputFile));
  const merged = JSON.parse(await readFile(outputFile, 'utf8'));
  assert.deepEqual(Object.keys(merged).sort(), ['/src/a.ts', '/src/b.ts']);
});

void test('writes an HTML report from a merged coverage file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'merge-coverage-report-'));
  const coverageFile = join(directory, 'coverage-final.json');
  const reportDirectory = join(directory, 'report');
  await writeFile(coverageFile, JSON.stringify(fileCoverage('/src/a.ts')));

  writeReport(coverageFile, reportDirectory);

  assert.ok(existsSync(join(reportDirectory, 'index.html')));
});
