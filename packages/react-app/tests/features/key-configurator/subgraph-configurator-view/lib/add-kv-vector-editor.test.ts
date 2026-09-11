/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Tests the pure Add KV Vector Editor language independently of React state.
 * It locks parsing, whitespace normalization, display formatting, suggestions,
 * duplicate eligibility, and the rule that ambiguous text waits for a choice.
 */
import {
  applyKvVectorEditorSuggestion,
  formatKvVectorCandidate,
  formatKvVectorEditorInput,
  getAddKvVectorEligibility,
  getKvVectorEditorSuggestions,
  getKvVectorPairsForSelection,
  resolveKvVectorEditorInput,
} from '~features/key-configurator/subgraph-configurator-view/lib/add-kv-vector-editor';
import {getKvVectorEditorDiagnosticMessage} from '~features/key-configurator/subgraph-configurator-view/lib/kv-vector-editor-diagnostic';

import {createKeyDefinitionDtos} from '../../../../entities/key-definitions/model/key-definition.fixture';

const definitions = createKeyDefinitionDtos([
  {
    name: 'DeviceTX',
    naturalId: 1,
    systemId: 'key-device',
    values: [{name: 'A2B_Mic', naturalId: 11, systemId: 'value-a2b'}],
  },
  {
    name: 'StreamTX',
    naturalId: 2,
    systemId: 'key-stream',
    values: [{name: 'PCM_ULL_Record', naturalId: 22, systemId: 'value-pcm'}],
  },
]);

describe('resolveKvVectorEditorInput', () => {
  it.each([
    '[DeviceTX:A2B_Mic][StreamTX:PCM_ULL_Record]',
    '[DeviceTX:A2B_Mic] [StreamTX:PCM_ULL_Record]',
    'A2B_Mic+PCM_ULL_Record',
    '[DeviceTX:A2B_Mic]PCM_ULL_Record',
  ])('resolves supported input %s atomically', (text) => {
    const result = resolveKvVectorEditorInput(text, definitions);

    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') {
      expect(result.keyValuePairs).toHaveLength(2);
    }
  });

  it('accepts harmless formatting whitespace and line breaks', () => {
    const keyValueResult = resolveKvVectorEditorInput(
      ' [ DeviceTX : A2B_Mic ]\n[ StreamTX : PCM_ULL_Record ] ',
      definitions,
    );
    const valueOnlyResult = resolveKvVectorEditorInput(
      ' A2B_Mic \r\n + PCM_ULL_Record ',
      definitions,
    );

    expect(keyValueResult.kind).toBe('valid');
    expect(valueOnlyResult.kind).toBe('valid');
  });

  it('returns a neutral diagnostic containing the incomplete fragment', () => {
    const result = resolveKvVectorEditorInput('[DeviceTX:A2B_Mic', definitions);

    expect(result).toMatchObject({
      diagnostic: {
        code: 'incomplete-pair',
        fragment: '[DeviceTX:A2B_Mic',
        severity: 'hint',
      },
      kind: 'incomplete',
    });
    if (result.kind === 'incomplete') {
      expect(getKvVectorEditorDiagnosticMessage(result.diagnostic)).toBe(
        'Complete "[DeviceTX:A2B_Mic" with ].',
      );
    }
  });

  it('identifies unknown key and value text', () => {
    const unknownKey = resolveKvVectorEditorInput(
      '[StremTX:A2B_Mic]',
      definitions,
    );
    const unknownValue = resolveKvVectorEditorInput(
      '[StreamTX:PCM_Recrod]',
      definitions,
    );

    expect(unknownKey).toMatchObject({
      diagnostic: {code: 'unknown-key', keyName: 'StremTX'},
      kind: 'invalid',
    });
    expect(unknownValue).toMatchObject({
      diagnostic: {
        code: 'unknown-value',
        keyName: 'StreamTX',
        valueName: 'PCM_Recrod',
      },
      kind: 'invalid',
    });
    if (unknownKey.kind === 'invalid') {
      expect(getKvVectorEditorDiagnosticMessage(unknownKey.diagnostic)).toBe(
        'Key "StremTX" was not found.',
      );
    }
    if (unknownValue.kind === 'invalid') {
      expect(getKvVectorEditorDiagnosticMessage(unknownValue.diagnostic)).toBe(
        'Value "PCM_Recrod" is not available for key "StreamTX".',
      );
    }
  });

  it('identifies duplicate Key Value keys by text', () => {
    const duplicate = resolveKvVectorEditorInput(
      '[DeviceTX:A2B_Mic][DeviceTX:A2B_Mic]',
      definitions,
    );
    expect(duplicate).toMatchObject({
      diagnostic: {code: 'duplicate-key', keyName: 'DeviceTX'},
      kind: 'invalid',
    });
  });

  it('accepts repeated Value Only tokens with deterministic key assignments', () => {
    const repeatedValueDefinitions = createKeyDefinitionDtos([
      {
        name: 'Key1',
        naturalId: 1,
        systemId: 'key-1',
        values: [{name: 'LL', naturalId: 11, systemId: 'value-1-ll'}],
      },
      {
        name: 'Key2',
        naturalId: 2,
        systemId: 'key-2',
        values: [{name: 'LL', naturalId: 21, systemId: 'value-2-ll'}],
      },
      {
        name: 'Key3',
        naturalId: 3,
        systemId: 'key-3',
        values: [{name: 'LL', naturalId: 31, systemId: 'value-3-ll'}],
      },
    ]);

    const resolved = resolveKvVectorEditorInput(
      'LL+LL',
      repeatedValueDefinitions,
    );

    expect(resolved).toMatchObject({
      diagnostic: {
        code: 'value-only-auto-resolved',
        severity: 'warning',
      },
      kind: 'valid',
    });
    expect(resolved.keyValuePairs.map((pair) => pair.keyInfo.keyLabel)).toEqual(
      ['Key1', 'Key2'],
    );
    if (resolved.kind !== 'valid' || !resolved.diagnostic) {
      throw new Error('Expected an automatic-resolution warning.');
    }
    expect(getKvVectorEditorDiagnosticMessage(resolved.diagnostic)).toBe(
      'Values are shared by multiple keys. Matching keys were selected automatically by key ID. Use Key Value mode to choose keys explicitly, or verify the Selection Panel.',
    );
  });

  it('prioritizes repeated Value Only assignments by numeric key ID', () => {
    const outOfOrderDefinitions = createKeyDefinitionDtos([
      {
        name: 'Key3',
        naturalId: 3,
        systemId: 'key-3',
        values: [{name: 'LL', naturalId: 31, systemId: 'value-3-ll'}],
      },
      {
        name: 'Key1',
        naturalId: 1,
        systemId: 'key-1',
        values: [{name: 'LL', naturalId: 11, systemId: 'value-1-ll'}],
      },
      {
        name: 'Key2',
        naturalId: 2,
        systemId: 'key-2',
        values: [{name: 'LL', naturalId: 21, systemId: 'value-2-ll'}],
      },
    ]);

    const resolved = resolveKvVectorEditorInput('LL+LL', outOfOrderDefinitions);

    expect(resolved).toMatchObject({kind: 'valid'});
    if (resolved.kind !== 'valid') {
      return;
    }
    expect(resolved.keyValuePairs.map((pair) => pair.keyInfo.keyLabel)).toEqual(
      ['Key1', 'Key2'],
    );
  });

  it('uses system ID to break a numeric key ID tie', () => {
    const sameIdDefinitions = createKeyDefinitionDtos([
      {
        name: 'KeyB',
        naturalId: 1,
        systemId: 'key-b',
        values: [{name: 'LL', naturalId: 11, systemId: 'value-b-ll'}],
      },
      {
        name: 'KeyA',
        naturalId: 1,
        systemId: 'key-a',
        values: [{name: 'LL', naturalId: 12, systemId: 'value-a-ll'}],
      },
    ]);

    const resolved = resolveKvVectorEditorInput('LL', sameIdDefinitions);

    expect(resolved).toMatchObject({kind: 'valid'});
    if (resolved.kind !== 'valid') {
      return;
    }
    expect(resolved.keyValuePairs[0].keyInfo.keyLabel).toBe('KeyA');
  });

  it('finds a complete Value Only assignment when the first key is needed later', () => {
    const constrainedDefinitions = createKeyDefinitionDtos([
      {
        name: 'Key1',
        naturalId: 1,
        systemId: 'key-1',
        values: [
          {name: 'LL', naturalId: 11, systemId: 'value-1-ll'},
          {name: 'MM', naturalId: 12, systemId: 'value-1-mm'},
        ],
      },
      {
        name: 'Key2',
        naturalId: 2,
        systemId: 'key-2',
        values: [{name: 'LL', naturalId: 21, systemId: 'value-2-ll'}],
      },
    ]);

    const resolved = resolveKvVectorEditorInput(
      'LL+MM',
      constrainedDefinitions,
    );

    expect(resolved).toMatchObject({
      diagnostic: {
        code: 'value-only-auto-resolved',
        severity: 'warning',
      },
      kind: 'valid',
    });
    expect(resolved.keyValuePairs.map((pair) => pair.keyInfo.keyLabel)).toEqual(
      ['Key2', 'Key1'],
    );
  });

  it('preserves an explicit Value Only key while resolving remaining tokens', () => {
    const repeatedValueDefinitions = createKeyDefinitionDtos([
      {
        name: 'Key1',
        naturalId: 1,
        systemId: 'key-1',
        values: [{name: 'LL', naturalId: 11, systemId: 'value-1-ll'}],
      },
      {
        name: 'Key2',
        naturalId: 2,
        systemId: 'key-2',
        values: [{name: 'LL', naturalId: 21, systemId: 'value-2-ll'}],
      },
    ]);

    const resolved = resolveKvVectorEditorInput(
      'LL+LL',
      repeatedValueDefinitions,
      'value-only',
      [
        {
          keySystemId: 'key-2',
          tokenIndex: 0,
          valueSystemId: 'value-2-ll',
        },
      ],
    );

    expect(resolved).toMatchObject({kind: 'valid'});
    expect(resolved.keyValuePairs.map((pair) => pair.keyInfo.keyLabel)).toEqual(
      ['Key2', 'Key1'],
    );
  });

  it('rejects Value Only text that has no distinct-key assignment', () => {
    const repeatedValueDefinitions = createKeyDefinitionDtos([
      {
        name: 'Key1',
        naturalId: 1,
        systemId: 'key-1',
        values: [{name: 'LL', naturalId: 11, systemId: 'value-1-ll'}],
      },
      {
        name: 'Key2',
        naturalId: 2,
        systemId: 'key-2',
        values: [{name: 'LL', naturalId: 21, systemId: 'value-2-ll'}],
      },
      {
        name: 'Key3',
        naturalId: 3,
        systemId: 'key-3',
        values: [{name: 'LL', naturalId: 31, systemId: 'value-3-ll'}],
      },
    ]);

    expect(
      resolveKvVectorEditorInput('LL+LL+LL+LL', repeatedValueDefinitions),
    ).toMatchObject({
      diagnostic: {
        code: 'value-only-no-distinct-key-assignment',
        severity: 'error',
      },
      kind: 'invalid',
    });
  });

  it.each([
    {
      diagnostic: {code: 'missing-key', fragment: '[:A2B_Mic]'},
      text: '[:A2B_Mic]',
    },
    {
      diagnostic: {
        code: 'missing-value',
        fragment: '[DeviceTX:]',
        keyName: 'DeviceTX',
      },
      text: '[DeviceTX:]',
    },
    {
      diagnostic: {
        code: 'missing-separator',
        fragment: '[DeviceTX A2B_Mic]',
      },
      text: '[DeviceTX A2B_Mic]',
    },
    {
      diagnostic: {
        code: 'extra-separator',
        fragment: '[DeviceTX:A2B:Mic]',
      },
      text: '[DeviceTX:A2B:Mic]',
    },
    {
      diagnostic: {
        code: 'empty-value-token',
        fragment: 'A2B_Mic++PCM_ULL_Record',
      },
      text: 'A2B_Mic++PCM_ULL_Record',
    },
    {
      diagnostic: {code: 'unknown-value-token', valueName: 'PCM_Recrod'},
      text: 'PCM_Recrod',
    },
    {
      diagnostic: {
        code: 'missing-brackets',
        fragment: 'DeviceTX:A2B_Mic',
      },
      text: 'DeviceTX:A2B_Mic',
    },
    {
      diagnostic: {
        code: 'used-key-conflict',
        keyName: 'DeviceTX',
        valueName: 'A2B_Mic',
      },
      text: '[DeviceTX:A2B_Mic]A2B_Mic',
    },
  ])('reports a contextual diagnostic for $text', ({diagnostic, text}) => {
    expect(resolveKvVectorEditorInput(text, definitions)).toMatchObject({
      diagnostic,
      kind: 'invalid',
    });
  });

  it('formats diagnostics with offending text instead of an index', () => {
    expect(
      getKvVectorEditorDiagnosticMessage({
        code: 'missing-brackets',
        fragment: 'DeviceTX:A2B_Mic',
        severity: 'error',
      }),
    ).toBe('"DeviceTX:A2B_Mic" must use [Key:Value] format.');
    expect(
      getKvVectorEditorDiagnosticMessage({
        code: 'unknown-value-token',
        severity: 'error',
        valueName: 'PCM_Recrod',
      }),
    ).toBe('Value "PCM_Recrod" was not found for any key.');
  });

  it('does not remove whitespace inside a key or value name', () => {
    expect(
      resolveKvVectorEditorInput('[Device TX:A2B_Mic]', definitions),
    ).toMatchObject({
      diagnostic: {code: 'unknown-key', keyName: 'Device TX'},
      kind: 'invalid',
    });
    expect(
      resolveKvVectorEditorInput('[DeviceTX:A2B Mic]', definitions),
    ).toMatchObject({
      diagnostic: {
        code: 'unknown-value',
        keyName: 'DeviceTX',
        valueName: 'A2B Mic',
      },
      kind: 'invalid',
    });
  });

  it('reports unavailable definitions instead of resolving input', () => {
    expect(resolveKvVectorEditorInput('A2B_Mic', null)).toMatchObject({
      diagnostic: {code: 'definitions-unavailable'},
      kind: 'invalid',
    });
  });

  it('preserves plus characters inside bracketed definition names', () => {
    const definitionsWithPlus = createKeyDefinitionDtos([
      {
        name: 'Direction',
        naturalId: 5,
        systemId: 'key-direction',
        values: [{name: 'A + B', naturalId: 55, systemId: 'value-a-plus-b'}],
      },
    ]);

    expect(
      resolveKvVectorEditorInput('[ Direction : A + B ]', definitionsWithPlus)
        .kind,
    ).toBe('valid');
    expect(
      resolveKvVectorEditorInput('A + B', definitionsWithPlus),
    ).toMatchObject({
      diagnostic: {code: 'value-only-unavailable'},
      kind: 'invalid',
    });
  });

  it('formats candidate text in its current order and blocks duplicate Add', () => {
    const result = resolveKvVectorEditorInput(
      'PCM_ULL_Record+A2B_Mic',
      definitions,
    );
    expect(result.kind).toBe('valid');
    if (result.kind !== 'valid') {
      return;
    }

    expect(
      formatKvVectorCandidate(result.keyValuePairs, definitions, 'value-only'),
    ).toBe('PCM_ULL_Record+A2B_Mic');
    expect(
      getAddKvVectorEligibility(result.keyValuePairs, [
        {
          isEc: false,
          keyValuePairs: result.keyValuePairs,
          selected: true,
          systemId: 'existing',
        },
      ]),
    ).toBe(false);
  });

  it('preserves the editor pair order while text is being entered', () => {
    const result = resolveKvVectorEditorInput(
      'PCM_ULL_Record+A2B_Mic',
      definitions,
    );

    expect(result.kind).toBe('valid');
    if (result.kind !== 'valid') {
      return;
    }

    expect(
      formatKvVectorEditorInput(
        result.keyValuePairs,
        definitions,
        'value-only',
        false,
      ),
    ).toBe('PCM_ULL_Record+A2B_Mic');
  });

  it('preserves Selection Panel choice order while composing a candidate', () => {
    const pairs = getKvVectorPairsForSelection(
      definitions,
      ['key-stream', 'key-device'],
      {
        'key-device': 'value-a2b',
        'key-stream': 'value-pcm',
      },
    );

    expect(formatKvVectorCandidate(pairs, definitions, 'key-value')).toBe(
      '[StreamTX:PCM_ULL_Record] [DeviceTX:A2B_Mic]',
    );
  });

  it('formats Key Value pairs with a wrap boundary between complete pairs', () => {
    const result = resolveKvVectorEditorInput(
      '[DeviceTX:A2B_Mic][StreamTX:PCM_ULL_Record]',
      definitions,
    );

    expect(result.kind).toBe('valid');
    if (result.kind !== 'valid') {
      return;
    }

    expect(
      formatKvVectorEditorInput(
        result.keyValuePairs,
        definitions,
        'key-value',
        false,
      ),
    ).toBe('[DeviceTX:A2B_Mic] [StreamTX:PCM_ULL_Record]');
  });

  it('blocks Add for a persisted vector with matching numeric IDs', () => {
    const candidate = resolveKvVectorEditorInput('A2B_Mic', definitions);

    expect(candidate.kind).toBe('valid');
    if (candidate.kind !== 'valid') {
      return;
    }

    expect(
      getAddKvVectorEligibility(candidate.keyValuePairs, [
        {
          isEc: false,
          keyValuePairs: [
            {
              ...candidate.keyValuePairs[0],
              keyInfo: {
                ...candidate.keyValuePairs[0].keyInfo,
                keySystemId: 'persisted-key-system-id',
              },
              valueInfo: {
                ...candidate.keyValuePairs[0].valueInfo,
                valueSystemId: 'persisted-value-system-id',
              },
            },
          ],
          selected: true,
          systemId: 'persisted-vector',
        },
      ]),
    ).toBe(false);
  });

  it('allows Add for a different value under a stored key', () => {
    const candidate = resolveKvVectorEditorInput('A2B_Mic', definitions);

    expect(candidate.kind).toBe('valid');
    if (candidate.kind !== 'valid') {
      return;
    }

    expect(
      getAddKvVectorEligibility(candidate.keyValuePairs, [
        {
          isEc: false,
          keyValuePairs: [
            {
              ...candidate.keyValuePairs[0],
              valueInfo: {
                ...candidate.keyValuePairs[0].valueInfo,
                valueId: 12,
                valueSystemId: 'other-value',
              },
            },
          ],
          selected: true,
          systemId: 'persisted-vector',
        },
      ]),
    ).toBe(true);
  });

  it('retains a valid Value Only continuation delimiter', () => {
    const result = resolveKvVectorEditorInput('A2B_Mic+', definitions);

    expect(result.kind).toBe('valid');
    if (result.kind !== 'valid') {
      return;
    }

    expect(
      formatKvVectorEditorInput(
        result.keyValuePairs,
        definitions,
        'value-only',
        true,
      ),
    ).toBe('A2B_Mic+');
  });

  it('ignores incidental whitespace after a Value Only continuation', () => {
    const result = resolveKvVectorEditorInput('A2B_Mic+ ', definitions);

    expect(result.kind).toBe('valid');
  });
});

describe('getKvVectorEditorSuggestions', () => {
  it('offers complete pairs instead of a standalone key', () => {
    const suggestions = getKvVectorEditorSuggestions('[Device', definitions);

    expect(suggestions.map((suggestion) => suggestion.label)).toEqual([
      '[DeviceTX:A2B_Mic]',
    ]);
  });

  it('suppresses suggestions when a preceding pair is invalid', () => {
    expect(
      getKvVectorEditorSuggestions('[Unknown:Value][Stream', definitions),
    ).toEqual([]);
  });

  it('does not suggest a key that is already used by a completed pair', () => {
    expect(
      getKvVectorEditorSuggestions('[DeviceTX:A2B_Mic][Device', definitions),
    ).toEqual([]);
  });

  it('matches fragments in Key Value and Value Only input', () => {
    expect(
      getKvVectorEditorSuggestions('[vice', definitions).map(
        (suggestion) => suggestion.label,
      ),
    ).toEqual(['[DeviceTX:A2B_Mic]']);
    expect(
      getKvVectorEditorSuggestions('[StreamTX:Record', definitions).map(
        (suggestion) => suggestion.label,
      ),
    ).toEqual(['[StreamTX:PCM_ULL_Record]']);
    expect(
      getKvVectorEditorSuggestions('Record', definitions).map(
        (suggestion) => suggestion.label,
      ),
    ).toEqual(['PCM_ULL_Record (StreamTX)']);
  });

  it('matches key names as well as value names for Value Only suggestions', () => {
    expect(
      getKvVectorEditorSuggestions('Device', definitions).map(
        (suggestion) => suggestion.label,
      ),
    ).toEqual(['A2B_Mic (DeviceTX)']);
  });

  it('orders equal-value suggestions by numeric key ID', () => {
    const outOfOrderDefinitions = createKeyDefinitionDtos([
      {
        name: 'KeyC',
        naturalId: 3,
        systemId: 'key-c',
        values: [{name: 'LL', naturalId: 31, systemId: 'value-c-ll'}],
      },
      {
        name: 'KeyB',
        naturalId: 1,
        systemId: 'key-b',
        values: [{name: 'LL', naturalId: 11, systemId: 'value-b-ll'}],
      },
      {
        name: 'KeyA',
        naturalId: 2,
        systemId: 'key-a',
        values: [{name: 'LL', naturalId: 21, systemId: 'value-a-ll'}],
      },
    ]);

    expect(
      getKvVectorEditorSuggestions('LL', outOfOrderDefinitions).map(
        (suggestion) => suggestion.keyLabel,
      ),
    ).toEqual(['KeyB', 'KeyA', 'KeyC']);
  });

  it('uses system ID to break an equal-value suggestion ID tie', () => {
    const sameIdDefinitions = createKeyDefinitionDtos([
      {
        name: 'KeyB',
        naturalId: 1,
        systemId: 'key-b',
        values: [{name: 'LL', naturalId: 11, systemId: 'value-b-ll'}],
      },
      {
        name: 'KeyA',
        naturalId: 1,
        systemId: 'key-a',
        values: [{name: 'LL', naturalId: 12, systemId: 'value-a-ll'}],
      },
    ]);

    expect(
      getKvVectorEditorSuggestions('LL', sameIdDefinitions).map(
        (suggestion) => suggestion.keyLabel,
      ),
    ).toEqual(['KeyA', 'KeyB']);
  });

  it('suggests only values of unused keys in a mixed continuation', () => {
    const suggestions = getKvVectorEditorSuggestions(
      '[DeviceTX:A2B_Mic]P',
      definitions,
    );

    expect(suggestions.map((suggestion) => suggestion.label)).toEqual([
      'PCM_ULL_Record (StreamTX)',
    ]);
  });

  it('replaces only the bracketed pair at the caret with a complete pair', () => {
    const text = '[Dev][StreamTX:PCM_ULL_Record]';
    const [suggestion] = getKvVectorEditorSuggestions(text, definitions, 4);

    expect(applyKvVectorEditorSuggestion(text, suggestion)).toBe(
      '[DeviceTX:A2B_Mic][StreamTX:PCM_ULL_Record]',
    );
  });

  it('replaces only the value token when the caret is in a known key pair', () => {
    const text = '[DeviceTX:A][StreamTX:PCM_ULL_Record]';
    const [suggestion] = getKvVectorEditorSuggestions(text, definitions, 11);

    expect(applyKvVectorEditorSuggestion(text, suggestion)).toBe(
      '[DeviceTX:A2B_Mic][StreamTX:PCM_ULL_Record]',
    );
  });

  it('appends a continuation delimiter after a Value Only commit', () => {
    const [suggestion] = getKvVectorEditorSuggestions('A2', definitions);

    expect(applyKvVectorEditorSuggestion('A2', suggestion)).toBe('A2B_Mic+');
  });

  it('does not suggest values until a Value Only prefix is entered', () => {
    expect(getKvVectorEditorSuggestions('A2B_Mic+', definitions)).toEqual([]);
    expect(getKvVectorEditorSuggestions('A2B_Mic+ ', definitions)).toEqual([]);
  });

  it('does not offer suggestions for a complete valid vector', () => {
    expect(
      getKvVectorEditorSuggestions(
        '[DeviceTX:A2B_Mic] [StreamTX:PCM_ULL_Record]',
        definitions,
        4,
      ),
    ).toEqual([]);
  });

  it('offers suggestions across formatting whitespace and line breaks', () => {
    expect(
      getKvVectorEditorSuggestions(
        '[DeviceTX:A2B_Mic]\n[ Stream',
        definitions,
      ).map((suggestion) => suggestion.label),
    ).toEqual(['[StreamTX:PCM_ULL_Record]']);
    expect(
      getKvVectorEditorSuggestions('A2B_Mic+\n Record', definitions).map(
        (suggestion) => suggestion.label,
      ),
    ).toEqual(['PCM_ULL_Record (StreamTX)']);
  });
});
