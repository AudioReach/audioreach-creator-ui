/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {readFile} from 'node:fs/promises';
import {dirname, isAbsolute, join} from 'node:path';

import type {JsonObject, JsonValue, TestData} from './test-context';

export type TestInputOverrides = Partial<TestData>;

export type TestInputs = {
  readonly cases?: Readonly<Record<string, TestInputOverrides>>;
  readonly defaults?: TestInputOverrides;
};

const pathKeys = new Set([
  'rejectedProjectPath',
  'validOpenProjectPath',
  'workspacePath',
]);

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    (Array.isArray(value) && value.every(isJsonValue)) ||
    isJsonObject(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseOverrides(
  value: unknown,
  description: string,
): TestInputOverrides {
  if (!isRecord(value)) {
    throw new Error(`${description} must be an object`);
  }

  for (const [key, input] of Object.entries(value)) {
    if (!['customInputs', ...pathKeys, 'useCaseQuery'].includes(key)) {
      throw new Error(`Unknown test input "${key}"`);
    }
    if (
      key === 'customInputs' &&
      input !== undefined &&
      !isJsonObject(input)
    ) {
      throw new Error('Test input "customInputs" must be a JSON object');
    }
    if (key !== 'customInputs' && input !== undefined && typeof input !== 'string') {
      throw new Error(`Test input "${key}" must be a string`);
    }
  }

  return value;
}

export function parseTestInputs(value: unknown): TestInputs {
  if (!isRecord(value)) {
    throw new Error('Test inputs must be an object');
  }

  const defaults = value.defaults
    ? parseOverrides(value.defaults, 'Test input defaults')
    : undefined;
  const rawCases = value.cases;
  if (rawCases !== undefined && !isRecord(rawCases)) {
    throw new Error('Test input cases must be an object');
  }

  const cases: Record<string, TestInputOverrides> = {};
  for (const [caseId, input] of Object.entries(rawCases ?? {})) {
    cases[caseId] = parseOverrides(
      input,
      `Test input case "${caseId}"`,
    );
  }

  return {cases, defaults};
}

export async function loadTestInputs(filePath: string): Promise<TestInputs> {
  let fileContents: string;
  try {
    fileContents = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read test inputs file: ${filePath}`, {
      cause: error,
    });
  }

  try {
    return parseTestInputs(JSON.parse(fileContents) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Test inputs file is not valid JSON: ${filePath}`, {
        cause: error,
      });
    }
    throw error;
  }
}

function resolveOverrides(
  overrides: TestInputOverrides,
  filePath: string,
): TestInputOverrides {
  const testsDirectory = dirname(dirname(filePath));
  const resolved = {...overrides};
  for (const key of pathKeys) {
    const value = resolved[key as keyof TestInputOverrides];
    if (typeof value === 'string' && !isAbsolute(value)) {
      resolved[key as keyof TestInputOverrides] = join(testsDirectory, value);
    }
  }
  return resolved;
}

function mergeJsonObjects(
  base: JsonObject,
  override: JsonObject,
): JsonObject {
  const merged: Record<string, JsonValue> = {...base};
  for (const [key, value] of Object.entries(override)) {
    const baseValue = merged[key];
    merged[key] =
      isJsonObject(baseValue) && isJsonObject(value)
        ? mergeJsonObjects(baseValue, value)
        : value;
  }
  return merged;
}

export function resolveTestData(
  baseData: TestData,
  inputs: TestInputs,
  caseId: string | undefined,
  filePath: string,
): TestData {
  const defaults = resolveOverrides(inputs.defaults ?? {}, filePath);
  const overrides = caseId
    ? resolveOverrides(inputs.cases?.[caseId] ?? {}, filePath)
    : {};

  return {
    ...baseData,
    ...defaults,
    ...overrides,
    customInputs: mergeJsonObjects(
      mergeJsonObjects(baseData.customInputs, defaults.customInputs ?? {}),
      overrides.customInputs ?? {},
    ),
  };
}
