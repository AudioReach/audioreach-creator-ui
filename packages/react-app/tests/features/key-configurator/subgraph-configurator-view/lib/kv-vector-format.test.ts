/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the two human-readable representations of one resolved KV vector.
 * Formatting is intentionally presentation-only: the key/value identity used
 * for selection, duplicate checks, and Apply remains unchanged.
 */
import type {KvSelection} from '~entities/subgraph-definitions';
import {formatKvVector} from '~features/key-configurator/subgraph-configurator-view/lib/kv-vector-format';

const vector: KvSelection = {
  isEc: false,
  keyValuePairs: [
    {
      keyInfo: {keyLabel: 'DeviceTX'},
      valueInfo: {valueLabel: 'A2B_Mic'},
    },
    {
      keyInfo: {keyLabel: 'StreamTX'},
      valueInfo: {valueLabel: 'PCM_ULL_Record'},
    },
  ] as never,
  selected: true,
  systemId: 'sgkv-1',
};

describe('formatKvVector', () => {
  it.each([
    ['key-value', '[DeviceTX:A2B_Mic][StreamTX:PCM_ULL_Record]'],
    ['value-only', 'A2B_Mic+PCM_ULL_Record'],
  ] as const)('formats a vector in %s mode', (mode, expected) => {
    expect(formatKvVector(vector, mode)).toBe(expected);
  });
});
