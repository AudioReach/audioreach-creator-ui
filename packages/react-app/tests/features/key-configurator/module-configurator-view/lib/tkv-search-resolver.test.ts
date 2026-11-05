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

const muteFixture: Record<string, TagGroup> = {
  TagMute: {
    id: 500,
    keys: {
      Mute: {
        id: 6,
        name: 'Mute',
        systemId: 'K600',
        values: [
          {id: 60, name: 'Off', systemId: 'V600'},
          {id: 61, name: 'On', systemId: 'V601'},
        ],
      },
    },
    name: 'TagMute',
  },
};

const tagEmptyFixture: Record<string, TagGroup> = {
  TagEmpty: {
    id: 600,
    keys: {},
    name: 'TagEmpty',
  },
};

describe('resolveTkvSearchInput', () => {
  it('returns kind empty for blank or whitespace-only text', () => {
    expect(resolveTkvSearchInput('', availableModuleTagsInfo, null)).toEqual({
      kind: 'empty',
    });
    expect(
      resolveTkvSearchInput('   ', availableModuleTagsInfo, null),
    ).toEqual({kind: 'empty'});
  });

  it('returns kind query for a non-matching fragment', () => {
    expect(
      resolveTkvSearchInput('Zzz', availableModuleTagsInfo, null),
    ).toEqual({kind: 'query', queryText: 'Zzz'});
  });

  it('resolves a single complete [Key: Value] token to a confirmed selection', () => {
    expect(
      resolveTkvSearchInput('[KeyTwo: Alpha2]', availableModuleTagsInfo, null),
    ).toEqual({
      kind: 'selection',
      pairs: [{key: keyTwo, value: keyTwo.values[1]}],
      queryText: '',
      tagGroupId: 100,
    });
  });

  it('resolves a single complete [Key: Value] token within a locked tag group', () => {
    expect(
      resolveTkvSearchInput('[KeyOne: Shared]', availableModuleTagsInfo, 100),
    ).toEqual({
      kind: 'selection',
      pairs: [{key: keyOne, value: keyOne.values[0]}],
      queryText: '',
      tagGroupId: 100,
    });
  });

  it('does not resolve a key that only exists outside the locked tag group', () => {
    expect(
      resolveTkvSearchInput(
        '[KeyThree: BetaOnly]',
        availableModuleTagsInfo,
        100,
      ),
    ).toEqual({kind: 'query', queryText: '[KeyThree: BetaOnly]'});
  });

  it('auto-resolves a value to the lower key id when two keys share the same name', () => {
    const duplicateKeyNameFixture: Record<string, TagGroup> = {
      TagDelta: {
        id: 400,
        keys: {
          KeyDup: {
            id: 4,
            name: 'KeyDup',
            systemId: 'K400',
            values: [{id: 40, name: 'Val', systemId: 'V400'}],
          },
        },
        name: 'TagDelta',
      },
      TagGamma: {
        id: 300,
        keys: {
          KeyDup: {
            id: 5,
            name: 'KeyDup',
            systemId: 'K500',
            values: [{id: 50, name: 'Val', systemId: 'V500'}],
          },
        },
        name: 'TagGamma',
      },
    };
    const lowerIdKey = duplicateKeyNameFixture.TagDelta.keys.KeyDup;

    expect(
      resolveTkvSearchInput('[KeyDup: Val]', duplicateKeyNameFixture, null),
    ).toEqual({
      diagnostic: {
        candidateKeyNames: ['KeyDup', 'KeyDup'],
        code: 'value-auto-resolved-by-key-id',
        severity: 'warning',
        valueName: 'Val',
      },
      kind: 'ambiguous',
      pairs: [{key: lowerIdKey, value: lowerIdKey.values[0]}],
      queryText: '',
      tagGroupId: 400,
    });
  });

  it('keeps an unterminated trailing bracket fragment as the query', () => {
    expect(
      resolveTkvSearchInput(
        '[KeyOne: Shared] [KeyTwo:',
        availableModuleTagsInfo,
        100,
      ),
    ).toEqual({
      kind: 'selection',
      pairs: [{key: keyOne, value: keyOne.values[0]}],
      queryText: '[KeyTwo:',
      tagGroupId: 100,
    });
  });

  it('resolves a compound bare "+" search into independent pairs', () => {
    const muteKey = muteFixture.TagMute.keys.Mute;

    expect(resolveTkvSearchInput('Off+On', muteFixture, null)).toEqual({
      kind: 'selection',
      pairs: [
        {key: muteKey, value: muteKey.values[0]},
        {key: muteKey, value: muteKey.values[1]},
      ],
      queryText: '',
      tagGroupId: 500,
    });
  });

  it('resolves a [TagName] bracket token for a tag group with no keys', () => {
    expect(resolveTkvSearchInput('[TagEmpty]', tagEmptyFixture, null)).toEqual(
      {
        kind: 'selection',
        pairs: [],
        queryText: '',
        tagGroupId: 600,
      },
    );
  });

  it('resolves a bare exact tag-name search for a tag group with no keys', () => {
    expect(resolveTkvSearchInput('TagEmpty', tagEmptyFixture, null)).toEqual({
      kind: 'selection',
      pairs: [],
      queryText: '',
      tagGroupId: 600,
    });
  });
});

describe('getTkvSearchSuggestions', () => {
  it('spans every tag group while unlocked', () => {
    const suggestions = getTkvSearchSuggestions(
      'Alpha',
      availableModuleTagsInfo,
      null,
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
    );

    expect(
      suggestions.map(
        (suggestion) => `${suggestion.value.name} (${suggestion.key.name})`,
      ),
    ).toEqual(['Alpha1 (KeyOne)', 'Alpha2 (KeyTwo)']);
  });

  it('matches key names as well as value names', () => {
    const suggestions = getTkvSearchSuggestions(
      'KeyOne',
      availableModuleTagsInfo,
      null,
    );
    expect(
      suggestions.map((suggestion) => suggestion.value.name),
    ).toEqual(['Alpha1', 'Shared']);
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

    const suggestions = getTkvSearchSuggestions('Match', rankingFixture, null);

    expect(suggestions.map((suggestion) => suggestion.value.name)).toEqual([
      'Match',
      'Matcher',
      'xMatchx',
    ]);
  });
});
