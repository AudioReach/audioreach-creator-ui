/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the pure CKV search resolver independently of React state. It locks
 * suggestion ranking and the rule that bare value tokens are resolved
 * against the entire key set at once, with no single-key lock (requirement
 * 8), unlike SGKV's bracket-syntax editor.
 */
import {
  getCkvSearchSuggestions,
  resolveCkvSearchInput,
} from '~features/graph-designer/lib/ckv-search-resolver';
import type {GraphKey} from '~shared/types/key-configurator-config.types';

const availableCalibrationKeys: Record<string, GraphKey> = {
  key_a: {
    id: 1,
    name: 'key_a',
    systemId: 'KEY001',
    values: [
      {id: 10, name: 'val_1', systemId: 'VAL001'},
      {id: 11, name: 'val_2', systemId: 'VAL002'},
    ],
  },
  key_b: {
    id: 2,
    name: 'key_b',
    systemId: 'KEY002',
    values: [
      {id: 12, name: 'val_3', systemId: 'VAL010'},
      {id: 13, name: 'val_4', systemId: 'VAL011'},
    ],
  },
  key_d: {
    id: 4,
    name: 'key_d',
    systemId: 'KEY004',
    values: [{id: 14, name: 'val_4', systemId: 'VAL040'}],
  },
};

describe('getCkvSearchSuggestions', () => {
  it('ranks an exact match before a prefix match and a key before a value at equal rank', () => {
    const rankingFixture: Record<string, GraphKey> = {
      key_match: {
        id: 1,
        name: 'match',
        systemId: 'KEY100',
        values: [{id: 100, name: 'alpha', systemId: 'VAL100'}],
      },
      key_matcher: {
        id: 3,
        name: 'matcher',
        systemId: 'KEY300',
        values: [{id: 300, name: 'beta', systemId: 'VAL300'}],
      },
      key_other: {
        id: 2,
        name: 'other',
        systemId: 'KEY200',
        values: [{id: 200, name: 'match', systemId: 'VAL200'}],
      },
    };

    const suggestions = getCkvSearchSuggestions(rankingFixture, 'match');

    expect(suggestions.map((suggestion) => suggestion.kind)).toEqual([
      'key',
      'value',
      'key',
    ]);
    expect(suggestions.map((suggestion) => suggestion.label)).toEqual([
      'match: alpha',
      'match (other)',
      'matcher: beta',
    ]);
  });

  it('returns every value whose name or key name matches a partial prefix', () => {
    const suggestions = getCkvSearchSuggestions(
      availableCalibrationKeys,
      'val_',
    );

    // 5 value matches: val_1, val_2, val_3, and val_4 under both key_b and
    // key_d, each surfaced as its own candidate since neither is dropped.
    expect(suggestions).toHaveLength(5);
    expect(suggestions.every((suggestion) => suggestion.kind === 'value')).toBe(
      true,
    );
    expect(
      suggestions.map((suggestion) => [
        suggestion.value.name,
        suggestion.key.name,
      ]),
    ).toEqual([
      ['val_1', 'key_a'],
      ['val_2', 'key_a'],
      ['val_3', 'key_b'],
      ['val_4', 'key_b'],
      ['val_4', 'key_d'],
    ]);
  });

  it('returns an empty array when a token matches nothing', () => {
    const suggestions = getCkvSearchSuggestions(
      availableCalibrationKeys,
      'nonexistent',
    );

    expect(suggestions).toEqual([]);
  });
});

describe('resolveCkvSearchInput', () => {
  it('resolves unambiguous tokens with no diagnostics', () => {
    const result = resolveCkvSearchInput(availableCalibrationKeys, [
      'val_1',
      'val_3',
    ]);

    expect(result.diagnostics).toEqual([]);
    expect(result.resolved).toEqual([
      {
        key: availableCalibrationKeys.key_a,
        value: {id: 10, name: 'val_1', systemId: 'VAL001'},
      },
      {
        key: availableCalibrationKeys.key_b,
        value: {id: 12, name: 'val_3', systemId: 'VAL010'},
      },
    ]);
  });

  it('reports an unknown-token diagnostic and excludes the token from resolved', () => {
    const result = resolveCkvSearchInput(availableCalibrationKeys, [
      'val_1',
      'nonexistent',
    ]);

    expect(result.resolved).toEqual([
      {
        key: availableCalibrationKeys.key_a,
        value: {id: 10, name: 'val_1', systemId: 'VAL001'},
      },
    ]);
    expect(result.diagnostics).toEqual([
      {code: 'unknown-token', severity: 'error', token: 'nonexistent'},
    ]);
  });

  it('resolves a single ambiguous token to its lowest-priority key with an auto-resolved warning', () => {
    // findDistinctKeyAssignment always succeeds for a lone over-subscribed
    // token (no other token competes for the same keys), so this is the
    // auto-resolved-by-key-id case, not a no-distinct-key-assignment error.
    const result = resolveCkvSearchInput(availableCalibrationKeys, ['val_4']);

    expect(result.resolved).toEqual([
      {
        key: availableCalibrationKeys.key_b,
        value: {id: 13, name: 'val_4', systemId: 'VAL011'},
      },
    ]);
    expect(result.diagnostics).toEqual([
      {
        candidateKeyNames: ['key_b', 'key_d'],
        code: 'value-auto-resolved-by-key-id',
        severity: 'warning',
        valueName: 'val_4',
      },
    ]);
  });

  it('reports a no-distinct-key-assignment diagnostic when candidates cannot all be assigned distinct keys', () => {
    // Three independent requests for 'val_4', but only two keys (key_b,
    // key_d) offer it, so no assignment can give every token a distinct key.
    const result = resolveCkvSearchInput(availableCalibrationKeys, [
      'val_4',
      'val_4',
      'val_4',
    ]);

    expect(result.resolved).toEqual([]);
    expect(result.diagnostics).toEqual([
      {
        candidateKeyNames: ['key_b', 'key_d'],
        code: 'no-distinct-key-assignment',
        severity: 'error',
        tokens: ['val_4', 'val_4', 'val_4'],
      },
    ]);
  });

  it('auto-resolves a shared value by key priority once another token forces the choice', () => {
    // 'val_3' only exists under key_b, forcing 'val_4' onto key_d even
    // though 'val_4' alone would be ambiguous between key_b and key_d.
    const result = resolveCkvSearchInput(availableCalibrationKeys, [
      'val_3',
      'val_4',
    ]);

    expect(result.resolved).toEqual([
      {
        key: availableCalibrationKeys.key_b,
        value: {id: 12, name: 'val_3', systemId: 'VAL010'},
      },
      {
        key: availableCalibrationKeys.key_d,
        value: {id: 14, name: 'val_4', systemId: 'VAL040'},
      },
    ]);
    expect(result.diagnostics).toEqual([
      {
        candidateKeyNames: ['key_b', 'key_d'],
        code: 'value-auto-resolved-by-key-id',
        severity: 'warning',
        valueName: 'val_4',
      },
    ]);
  });
});
