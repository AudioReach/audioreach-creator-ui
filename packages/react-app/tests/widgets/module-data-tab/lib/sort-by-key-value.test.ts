/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyValueInfo} from '~entities/spf-module-data';
import {compareByKeyValueSystemIds} from '~widgets/module-data-tab/lib/sort-by-key-value';

function makeKeyValueCollection(valueSystemId: string): KeyValueInfo[] {
  return [
    {
      keyInfo: {keyId: 1, keyLabel: 'Device', keySystemId: 'key-1'},
      valueInfo: {valueId: 1, valueLabel: valueSystemId, valueSystemId},
    },
  ];
}

describe('compareByKeyValueSystemIds', () => {
  it('orders ascending by valueSystemId regardless of input order', () => {
    const collections = [
      makeKeyValueCollection('SpeakerSysId'),
      makeKeyValueCollection('HeadphonesSysId'),
    ];

    const sorted = [...collections].sort((a, b) =>
      compareByKeyValueSystemIds(a, b),
    );

    expect(sorted.map((c) => c[0].valueInfo.valueSystemId)).toEqual([
      'HeadphonesSysId',
      'SpeakerSysId',
    ]);
  });

  it('treats equal valueSystemId sequences as equal', () => {
    const a = makeKeyValueCollection('SpeakerSysId');
    const b = makeKeyValueCollection('SpeakerSysId');

    expect(compareByKeyValueSystemIds(a, b)).toBe(0);
  });

  it('compares by the joined sequence of valueSystemIds for multi-key collections', () => {
    const a: KeyValueInfo[] = [
      ...makeKeyValueCollection('SpeakerSysId'),
      {
        keyInfo: {keyId: 2, keyLabel: 'Volume', keySystemId: 'key-2'},
        valueInfo: {valueId: 1, valueLabel: 'Low', valueSystemId: 'ALowSysId'},
      },
    ];
    const b: KeyValueInfo[] = [
      ...makeKeyValueCollection('SpeakerSysId'),
      {
        keyInfo: {keyId: 2, keyLabel: 'Volume', keySystemId: 'key-2'},
        valueInfo: {
          valueId: 2,
          valueLabel: 'High',
          valueSystemId: 'ZHighSysId',
        },
      },
    ];

    expect(compareByKeyValueSystemIds(a, b)).toBeLessThan(0);
    expect(compareByKeyValueSystemIds(b, a)).toBeGreaterThan(0);
  });

  it('treats empty collections as equal', () => {
    expect(compareByKeyValueSystemIds([], [])).toBe(0);
  });
});
