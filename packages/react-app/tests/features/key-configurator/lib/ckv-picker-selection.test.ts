/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  buildCkvSystemId,
  generateCartesianProduct,
  getActiveSearchToken,
  groupSelectedValuesByKey,
  matchesSearchTerm,
  partitionKeysBySelection,
  resolveGraphKeyAndValue,
  resolveSelectedPairs,
  sortKeys,
} from '~features/key-configurator/lib/ckv-picker-selection';
import type {GraphKey} from '~shared/types/key-configurator-config.types';

const KEY_VOLUME: GraphKey = {
  id: 1,
  name: 'Volume',
  systemId: 'KEY_SYS_VOLUME',
  values: [
    {id: 10, name: 'Level_0', systemId: 'VAL_SYS_LEVEL_0'},
    {id: 11, name: 'Level_1', systemId: 'VAL_SYS_LEVEL_1'},
  ],
};

const KEY_GAIN: GraphKey = {
  id: 2,
  name: 'Gain',
  systemId: 'KEY_SYS_GAIN',
  values: [
    {id: 20, name: 'Gain_0', systemId: 'VAL_SYS_GAIN_0'},
    {id: 21, name: 'Gain_1', systemId: 'VAL_SYS_GAIN_1'},
  ],
};

const keyData: Record<string, GraphKey> = {
  Gain: KEY_GAIN,
  Volume: KEY_VOLUME,
};

describe('matchesSearchTerm', () => {
  it('matches when the key name contains the search term', () => {
    expect(matchesSearchTerm('Volume', KEY_VOLUME, 'vol', null)).toBe(true);
  });

  it('matches when the key id equals the search number', () => {
    expect(matchesSearchTerm('Volume', KEY_VOLUME, '1', 1)).toBe(true);
  });

  it('matches when a value name contains the search term', () => {
    expect(matchesSearchTerm('Volume', KEY_VOLUME, 'level_1', null)).toBe(true);
  });

  it('matches when a value id equals the search number', () => {
    expect(matchesSearchTerm('Volume', KEY_VOLUME, '11', 11)).toBe(true);
  });

  it('does not match when neither the key nor its values match', () => {
    expect(matchesSearchTerm('Volume', KEY_VOLUME, 'gain', null)).toBe(false);
  });
});

describe('getActiveSearchToken', () => {
  it('returns the trimmed text when there is no separator', () => {
    expect(getActiveSearchToken('  Level_1')).toBe('Level_1');
  });

  it('returns the token after the last space', () => {
    expect(getActiveSearchToken('[Volume: Level_0] Lev')).toBe('Lev');
  });

  it('returns the token after the last "+" separator', () => {
    expect(getActiveSearchToken('Level_0+Gai')).toBe('Gai');
  });

  it('treats the later of space or "+" as the boundary', () => {
    expect(getActiveSearchToken('a+b c')).toBe('c');
  });
});

describe('sortKeys', () => {
  const keys = ['Volume', 'Gain'];

  it('preserves original order when sortColumn is null', () => {
    expect(sortKeys(keys, keyData, null, 'asc')).toEqual(['Volume', 'Gain']);
  });

  it('sorts ascending by id', () => {
    expect(sortKeys(keys, keyData, 'id', 'asc')).toEqual(['Volume', 'Gain']);
  });

  it('sorts descending by id', () => {
    expect(sortKeys(keys, keyData, 'id', 'desc')).toEqual(['Gain', 'Volume']);
  });

  it('sorts ascending by name case-insensitively', () => {
    expect(sortKeys(keys, keyData, 'name', 'asc')).toEqual(['Gain', 'Volume']);
  });

  it('sorts descending by name', () => {
    expect(sortKeys(keys, keyData, 'name', 'desc')).toEqual(['Volume', 'Gain']);
  });

  it('does not mutate the input array', () => {
    const original = [...keys];
    sortKeys(keys, keyData, 'name', 'desc');
    expect(keys).toEqual(original);
  });
});

describe('partitionKeysBySelection', () => {
  it('moves keys with at least one selected value to the front', () => {
    const selectedKeyValues = {[KEY_GAIN.id]: {[KEY_GAIN.values[0].id]: true}};
    expect(
      partitionKeysBySelection(['Volume', 'Gain'], keyData, selectedKeyValues),
    ).toEqual(['Gain', 'Volume']);
  });

  it('preserves relative order within each group', () => {
    expect(partitionKeysBySelection(['Volume', 'Gain'], keyData, {})).toEqual([
      'Volume',
      'Gain',
    ]);
  });

  it('ignores a selection map entry whose value is false', () => {
    const selectedKeyValues = {
      [KEY_GAIN.id]: {[KEY_GAIN.values[0].id]: false},
    };
    expect(
      partitionKeysBySelection(['Volume', 'Gain'], keyData, selectedKeyValues),
    ).toEqual(['Volume', 'Gain']);
  });
});

describe('generateCartesianProduct', () => {
  it('returns a single combination for a single key with a single value', () => {
    const combinations = generateCartesianProduct([
      {key: KEY_VOLUME, values: [{id: 10, name: 'Level_0'}]},
    ]);
    expect(combinations).toEqual([
      [{key: KEY_VOLUME, value: {id: 10, name: 'Level_0'}}],
    ]);
  });

  it('returns every permutation across multiple keys and values', () => {
    const combinations = generateCartesianProduct([
      {
        key: KEY_VOLUME,
        values: [
          {id: 10, name: 'Level_0'},
          {id: 11, name: 'Level_1'},
        ],
      },
      {key: KEY_GAIN, values: [{id: 20, name: 'Gain_0'}]},
    ]);
    expect(combinations).toHaveLength(2);
    expect(combinations).toEqual([
      [
        {key: KEY_VOLUME, value: {id: 10, name: 'Level_0'}},
        {key: KEY_GAIN, value: {id: 20, name: 'Gain_0'}},
      ],
      [
        {key: KEY_VOLUME, value: {id: 11, name: 'Level_1'}},
        {key: KEY_GAIN, value: {id: 20, name: 'Gain_0'}},
      ],
    ]);
  });

  it('returns one empty combination when given no keys', () => {
    expect(generateCartesianProduct([])).toEqual([[]]);
  });
});

describe('groupSelectedValuesByKey', () => {
  it('groups only the selected values under their resolved key', () => {
    const selectedKeyValues = {
      [KEY_VOLUME.id]: {10: true, 11: false},
    };
    expect(groupSelectedValuesByKey(selectedKeyValues, keyData)).toEqual([
      {
        key: {id: 1, name: 'Volume', systemId: 'KEY_SYS_VOLUME'},
        values: [{id: 10, name: 'Level_0'}],
      },
    ]);
  });

  it('omits a key with no selected values', () => {
    const selectedKeyValues = {[KEY_VOLUME.id]: {10: false}};
    expect(groupSelectedValuesByKey(selectedKeyValues, keyData)).toEqual([]);
  });

  it('omits a key id that cannot be resolved against keyData', () => {
    const selectedKeyValues = {999: {1: true}};
    expect(groupSelectedValuesByKey(selectedKeyValues, keyData)).toEqual([]);
  });
});

describe('resolveGraphKeyAndValue', () => {
  it('resolves a known key id and value id to the full pair', () => {
    expect(resolveGraphKeyAndValue(keyData, 1, 10)).toEqual({
      key: KEY_VOLUME,
      value: KEY_VOLUME.values[0],
    });
  });

  it('returns null for an unknown key id', () => {
    expect(resolveGraphKeyAndValue(keyData, 999, 10)).toBeNull();
  });

  it('returns null for an unknown value id', () => {
    expect(resolveGraphKeyAndValue(keyData, 1, 999)).toBeNull();
  });
});

describe('resolveSelectedPairs', () => {
  it('resolves every flagged selection across multiple keys', () => {
    const selectedKeyValues = {
      [KEY_GAIN.id]: {20: true, 21: false},
      [KEY_VOLUME.id]: {10: true},
    };
    expect(resolveSelectedPairs(selectedKeyValues, keyData)).toEqual([
      {key: KEY_VOLUME, value: KEY_VOLUME.values[0]},
      {key: KEY_GAIN, value: KEY_GAIN.values[0]},
    ]);
  });

  it('returns an empty array when nothing is selected', () => {
    expect(resolveSelectedPairs({}, keyData)).toEqual([]);
  });
});

describe('buildCkvSystemId', () => {
  it('joins key:value systemId pairs sorted alphabetically', () => {
    const pairs = [
      {key: KEY_GAIN, value: KEY_GAIN.values[0]},
      {key: KEY_VOLUME, value: KEY_VOLUME.values[0]},
    ];
    expect(buildCkvSystemId(pairs)).toBe(
      'KEY_SYS_GAIN:VAL_SYS_GAIN_0|KEY_SYS_VOLUME:VAL_SYS_LEVEL_0',
    );
  });

  it('produces the same id regardless of input order', () => {
    const forward = [
      {key: KEY_VOLUME, value: KEY_VOLUME.values[0]},
      {key: KEY_GAIN, value: KEY_GAIN.values[0]},
    ];
    const reversed = [...forward].reverse();
    expect(buildCkvSystemId(forward)).toBe(buildCkvSystemId(reversed));
  });
});
