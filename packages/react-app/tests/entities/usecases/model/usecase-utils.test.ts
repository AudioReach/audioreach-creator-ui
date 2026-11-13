/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {getUsecaseKeyValueKey} from '~entities/usecases/model/usecase-utils';
import type {UsecaseItem} from '~entities/usecases/model/usecase.types';

// Builds one key-value pair from key and value natural ids.
const kv = (keyId: number, valueId: number, systemId: string) => ({
  key: {name: 'k', naturalId: keyId, systemId},
  value: {name: 'v', naturalId: valueId, systemId},
});

// Builds a usecase item with the given systemId and key-value pairs.
const item = (
  systemId: string,
  pairs: ReturnType<typeof kv>[],
): UsecaseItem => ({
  expanded: false,
  keyValuePairs: pairs,
  name: 'uc',
  systemId,
});

// Tests the key used to save and restore the selected usecases.
describe('getUsecaseKeyValueKey', () => {
  // Same key-values with different systemIds must give the same key.
  it('ignores systemIds so the key survives a project re-import', () => {
    expect(getUsecaseKeyValueKey(item('1', [kv(1, 2, 'a')]))).toBe(
      getUsecaseKeyValueKey(item('99', [kv(1, 2, 'b')])),
    );
  });

  // Different key-values must give different keys.
  it('differs for different key-value definitions', () => {
    expect(getUsecaseKeyValueKey(item('1', [kv(1, 2, 'a')]))).not.toBe(
      getUsecaseKeyValueKey(item('1', [kv(1, 3, 'a')])),
    );
  });
});
