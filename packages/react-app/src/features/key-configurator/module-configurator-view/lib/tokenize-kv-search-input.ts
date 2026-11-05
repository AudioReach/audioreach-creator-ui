/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Splits picker-box text into resolvable tokens, treating a `[...]` group —
 * exactly what Copy produces for a configured CKV/TKV entry — as one atomic
 * token instead of splitting on the space or "+" it may contain. Shared by
 * both CKV's and TKV's search resolvers so neither reimplements the same
 * bracket-aware scanning.
 */
export function tokenizeKvSearchInput(value: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let index = 0;

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) {
      tokens.push(trimmed);
    }
    current = '';
  };

  while (index < value.length) {
    const char = value[index];
    if (char === '[') {
      const closingIndex = value.indexOf(']', index);
      if (closingIndex < 0) {
        current += value.slice(index);
        break;
      }
      flush();
      tokens.push(value.slice(index, closingIndex + 1));
      index = closingIndex + 1;
      continue;
    }
    if (char === ' ' || char === '+') {
      flush();
      index += 1;
      continue;
    }
    current += char;
    index += 1;
  }
  flush();
  return tokens;
}
