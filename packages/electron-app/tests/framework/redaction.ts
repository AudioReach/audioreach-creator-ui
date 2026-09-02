/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export const REDACTED_VALUE = '[REDACTED]';

const sensitiveKeyPattern =
  /password|token|credential|secret|file[\s_-]*content/i;

export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key) ? REDACTED_VALUE : redactSecrets(entry),
    ]),
  );
}
