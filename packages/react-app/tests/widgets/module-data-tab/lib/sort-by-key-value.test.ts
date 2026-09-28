/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyValueInfo} from '~entities/spf-module-data';
import {compareByKeyValueSystemIds} from '~widgets/module-data-tab/lib/sort-by-key-value';

function makeKeyValuePairs(valueSystemId: string): KeyValueInfo[] {
  return [
    {
      key: {name: 'Device', naturalId: 1, systemId: 'key-1'},
      value: {name: valueSystemId, naturalId: 1, systemId: valueSystemId},
    },
  ];
}

describe('compareByKeyValueSystemIds', () => {
  it('orders ascending by valueSystemId regardless of input order', () => {
    const collections = [
      makeKeyValuePairs('SpeakerSysId'),
      makeKeyValuePairs('HeadphonesSysId'),
    ];

    const sorted = [...collections].sort((a, b) =>
      compareByKeyValueSystemIds(a, b),
    );

    expect(sorted.map((c) => c[0].value.systemId)).toEqual([
      'HeadphonesSysId',
      'SpeakerSysId',
    ]);
  });

  it('treats equal valueSystemId sequences as equal', () => {
    const a = makeKeyValuePairs('SpeakerSysId');
    const b = makeKeyValuePairs('SpeakerSysId');

    expect(compareByKeyValueSystemIds(a, b)).toBe(0);
  });

  it('compares by the joined sequence of valueSystemIds for multi-key collections', () => {
    const a: KeyValueInfo[] = [
      ...makeKeyValuePairs('SpeakerSysId'),
      {
        key: {name: 'Volume', naturalId: 2, systemId: 'key-2'},
        value: {name: 'Low', naturalId: 1, systemId: 'ALowSysId'},
      },
    ];
    const b: KeyValueInfo[] = [
      ...makeKeyValuePairs('SpeakerSysId'),
      {
        key: {name: 'Volume', naturalId: 2, systemId: 'key-2'},
        value: {
          name: 'High',
          naturalId: 2,
          systemId: 'ZHighSysId',
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
