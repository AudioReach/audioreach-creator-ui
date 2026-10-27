/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the pure TKV search resolver independently of React state. It locks
 * candidate scope to a single tag group once lockedTagGroupId is set
 * (requirement 10), unlike CKV's project-wide resolver, so a bare value
 * name only ever needs the lowest-key-id tiebreak, never backtracking.
 */
import {
  getTkvSearchSuggestions,
  resolveTkvSearchInput,
} from '~features/key-configurator/module-configurator-view/lib/tkv-search-resolver';
import type {TagGroup} from '~shared/types/key-configurator-config.types';

const availableModuleTagsInfo: Record<string, TagGroup> = {
  TagAlpha: {
    id: 100,
    keys: {
      KeyOne: {
        id: 1,
        name: 'KeyOne',
        systemId: 'K001',
        values: [
          {id: 10, name: 'Shared', systemId: 'V010'},
          {id: 11, name: 'Alpha1', systemId: 'V011'},
        ],
      },
      KeyTwo: {
        id: 2,
        name: 'KeyTwo',
        systemId: 'K002',
        values: [
          {id: 12, name: 'Shared', systemId: 'V012'},
          {id: 13, name: 'Alpha2', systemId: 'V013'},
        ],
      },
    },
    name: 'TagAlpha',
  },
  TagBeta: {
    id: 200,
    keys: {
      KeyThree: {
        id: 3,
        name: 'KeyThree',
        systemId: 'K003',
        values: [
          {id: 20, name: 'BetaOnly', systemId: 'V020'},
          {id: 21, name: 'Alpha1', systemId: 'V021'},
        ],
      },
    },
    name: 'TagBeta',
  },
};

const keyOne = availableModuleTagsInfo.TagAlpha.keys.KeyOne;
const keyTwo = availableModuleTagsInfo.TagAlpha.keys.KeyTwo;
const keyThree = availableModuleTagsInfo.TagBeta.keys.KeyThree;

describe('resolveTkvSearchInput', () => {
  it('returns kind empty for blank or whitespace-only text', () => {
    expect(
      resolveTkvSearchInput('', availableModuleTagsInfo, null, 'value-only'),
    ).toEqual({kind: 'empty'});
    expect(
      resolveTkvSearchInput('   ', availableModuleTagsInfo, null, 'value-only'),
    ).toEqual({kind: 'empty'});
  });

  it('returns kind query for a non-matching fragment while unlocked', () => {
    expect(
      resolveTkvSearchInput('Zzz', availableModuleTagsInfo, null, 'value-only'),
    ).toEqual({kind: 'query', queryText: 'Zzz'});
  });

  it('resolves a single exact value match while unlocked to a confirmed selection', () => {
    expect(
      resolveTkvSearchInput(
        'Alpha2',
        availableModuleTagsInfo,
        null,
        'value-only',
      ),
    ).toEqual({
      kind: 'selection',
      pairs: [{key: keyTwo, value: keyTwo.values[1]}],
      queryText: '',
    });
  });

  it('does not resolve a value that only exists outside the locked tag group', () => {
    expect(
      resolveTkvSearchInput(
        'BetaOnly',
        availableModuleTagsInfo,
        100,
        'value-only',
      ),
    ).toEqual({kind: 'query', queryText: 'BetaOnly'});
  });

  it('auto-resolves a value shared by two keys in the same tag group to the lower key id', () => {
    const result = resolveTkvSearchInput(
      'Shared',
      availableModuleTagsInfo,
      100,
      'value-only',
    );
    expect(result).toEqual({
      diagnostic: {
        candidateKeyNames: ['KeyOne', 'KeyTwo'],
        code: 'value-auto-resolved-by-key-id',
        severity: 'warning',
        valueName: 'Shared',
      },
      kind: 'ambiguous',
      pairs: [{key: keyOne, value: keyOne.values[0]}],
      queryText: '',
    });
  });

  it('resolves two plus-joined values and keeps a trailing fragment as the query', () => {
    expect(
      resolveTkvSearchInput(
        'Alpha2+BetaOnly+Zzz',
        availableModuleTagsInfo,
        null,
        'value-only',
      ),
    ).toEqual({
      kind: 'selection',
      pairs: [
        {key: keyTwo, value: keyTwo.values[1]},
        {key: keyThree, value: keyThree.values[0]},
      ],
      queryText: 'Zzz',
    });
  });

  it('resolves a single complete [Key: Value] token in key-value mode', () => {
    expect(
      resolveTkvSearchInput(
        '[KeyOne: Shared]',
        availableModuleTagsInfo,
        100,
        'key-value',
      ),
    ).toEqual({
      kind: 'selection',
      pairs: [{key: keyOne, value: keyOne.values[0]}],
      queryText: '',
    });
  });

  it('keeps an unterminated trailing bracket fragment as the query in key-value mode', () => {
    expect(
      resolveTkvSearchInput(
        '[KeyOne: Shared] [KeyTwo:',
        availableModuleTagsInfo,
        100,
        'key-value',
      ),
    ).toEqual({
      kind: 'selection',
      pairs: [{key: keyOne, value: keyOne.values[0]}],
      queryText: '[KeyTwo:',
    });
  });
});

describe('getTkvSearchSuggestions', () => {
  it('spans every tag group while unlocked', () => {
    const suggestions = getTkvSearchSuggestions(
      'Alpha',
      availableModuleTagsInfo,
      null,
      'value-only',
    );

    expect(
      suggestions.map(
        (suggestion) => `${suggestion.value.name} (${suggestion.key.name})`,
      ),
    ).toEqual(['Alpha1 (KeyOne)', 'Alpha1 (KeyThree)', 'Alpha2 (KeyTwo)']);
  });

  it('narrows candidates to only the locked tag group', () => {
    const suggestions = getTkvSearchSuggestions(
      'Alpha',
      availableModuleTagsInfo,
      100,
      'value-only',
    );

    expect(
      suggestions.map(
        (suggestion) => `${suggestion.value.name} (${suggestion.key.name})`,
      ),
    ).toEqual(['Alpha1 (KeyOne)', 'Alpha2 (KeyTwo)']);
  });

  it('matches key names only in key-value mode, never in value-only mode', () => {
    const keyValueSuggestions = getTkvSearchSuggestions(
      'KeyOne',
      availableModuleTagsInfo,
      null,
      'key-value',
    );
    expect(
      keyValueSuggestions.map((suggestion) => suggestion.value.name),
    ).toEqual(['Alpha1', 'Shared']);

    const valueOnlySuggestions = getTkvSearchSuggestions(
      'KeyOne',
      availableModuleTagsInfo,
      null,
      'value-only',
    );
    expect(valueOnlySuggestions).toHaveLength(0);
  });

  it('ranks an exact match above a prefix match above a substring match', () => {
    const rankingFixture: Record<string, TagGroup> = {
      TagRank: {
        id: 300,
        keys: {
          KeyRank: {
            id: 5,
            name: 'KeyRank',
            systemId: 'K500',
            values: [
              {id: 50, name: 'xMatchx', systemId: 'V500'},
              {id: 51, name: 'Match', systemId: 'V501'},
              {id: 52, name: 'Matcher', systemId: 'V502'},
            ],
          },
        },
        name: 'TagRank',
      },
    };

    const suggestions = getTkvSearchSuggestions(
      'Match',
      rankingFixture,
      null,
      'value-only',
    );

    expect(suggestions.map((suggestion) => suggestion.value.name)).toEqual([
      'Match',
      'Matcher',
      'xMatchx',
    ]);
  });
});
