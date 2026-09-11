/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyDefinitionResponseDto} from '~entities/key-definitions';
import type {ValueDefinitionDto} from '~entities/key-definitions/model/key-definition.dto';
import {
  areKvVectorsEqual,
  type KvSelection,
  type SubgraphKvPair,
} from '~entities/subgraph-definitions';

type KeyValue = SubgraphKvPair;

import type {KvVectorDisplayMode} from './kv-vector-format';
import type {KvVectorEditorDiagnostic} from './kv-vector-editor-diagnostic';

/**
 * Defines the SGKV Add Editor's text language without React or store state.
 * Callers parse text into resolved pairs, render suggestions for incomplete
 * input, and only hand valid, definition-backed pairs to the Edit Session.
 */
/** Result of parsing an SGKV Add candidate without mutating session state. */
export type ResolvedKvVectorInput =
  | {keyValuePairs: KeyValue[]; kind: 'empty'}
  | {
      diagnostic: KvVectorEditorDiagnostic;
      keyValuePairs: KeyValue[];
      kind: 'incomplete';
    }
  | {
      diagnostic: KvVectorEditorDiagnostic;
      keyValuePairs: KeyValue[];
      kind: 'invalid';
    }
  | {
      diagnostic?: KvVectorEditorDiagnostic;
      keyValuePairs: KeyValue[];
      kind: 'valid';
    };

/** Pins a Value Only token to the exact pair selected by the user. */
export interface ValueOnlyPairOverride {
  keySystemId: string;
  tokenIndex: number;
  valueSystemId: string;
}

export interface KvVectorEditorSuggestion {
  insertionText: string;
  keyLabel: string;
  keyNaturalId: number;
  keySystemId: string;
  kind: 'key-value-pair' | 'value-only';
  label: string;
  replacementRange: {end: number; start: number};
  valueLabel: string;
  valueSystemId?: string;
}

/** Replaces the active editor token with one complete key/value suggestion. */
export function applyKvVectorEditorSuggestion(
  text: string,
  suggestion: KvVectorEditorSuggestion,
): string {
  const {end, start} = suggestion.replacementRange;
  const result = `${text.slice(0, start)}${suggestion.insertionText}${text.slice(end)}`;
  return suggestion.kind === 'value-only' &&
    !text.includes('[') &&
    end === text.length &&
    !result.endsWith('+')
    ? `${result}+`
    : result;
}

/** Formats resolved candidate pairs for the active display mode. */
export function formatKvVectorCandidate(
  keyValuePairs: KeyValue[],
  definitions: KeyDefinitionResponseDto[],
  displayMode: KvVectorDisplayMode,
): string {
  return formatKvVectorPairs(keyValuePairs, definitions, displayMode);
}

/** Restores API definition order before a candidate is persisted. */
export function sortKvVectorPairsByDefinition(
  keyValuePairs: KeyValue[],
  definitions: KeyDefinitionResponseDto[],
): KeyValue[] {
  const orderByKeyId = new Map(
    definitions.map((key, index) => [key.systemId, index]),
  );
  return [...keyValuePairs].sort(
    (first, second) =>
      (orderByKeyId.get(first.keyInfo.keySystemId) ?? Number.MAX_SAFE_INTEGER) -
      (orderByKeyId.get(second.keyInfo.keySystemId) ?? Number.MAX_SAFE_INTEGER),
  );
}

function formatKvVectorPairs(
  keyValuePairs: KeyValue[],
  definitions: KeyDefinitionResponseDto[],
  displayMode: KvVectorDisplayMode,
): string {
  if (displayMode === 'value-only' && isValueOnlySupported(definitions)) {
    return keyValuePairs.map((pair) => pair.valueInfo.valueLabel).join('+');
  }

  return keyValuePairs
    .map((pair) => `[${pair.keyInfo.keyLabel}:${pair.valueInfo.valueLabel}]`)
    .join(' ');
}

/** Formats valid editor text while retaining an intentional trailing plus. */
export function formatKvVectorEditorInput(
  keyValuePairs: KeyValue[],
  definitions: KeyDefinitionResponseDto[],
  displayMode: KvVectorDisplayMode,
  hasValueOnlyContinuation: boolean,
): string {
  const formatted = formatKvVectorPairs(
    keyValuePairs,
    definitions,
    displayMode,
  );
  return displayMode === 'value-only' &&
    hasValueOnlyContinuation &&
    isValueOnlySupported(definitions)
    ? `${formatted}+`
    : formatted;
}

/** Rejects an empty or duplicate candidate before exposing the Add action. */
export function getAddKvVectorEligibility(
  keyValuePairs: KeyValue[],
  vectors: KvSelection[],
): boolean {
  if (keyValuePairs.length === 0) {
    return false;
  }

  return !vectors.some((vector) =>
    areKvVectorsEqual(vector.keyValuePairs, keyValuePairs),
  );
}

/** Returns complete, unused pair suggestions for the token at the caret. */
export function getKvVectorEditorSuggestions(
  text: string,
  definitions: KeyDefinitionResponseDto[] | null,
  caretPosition = text.length,
  displayMode: KvVectorDisplayMode = 'value-only',
  valueOnlyPairOverrides: ValueOnlyPairOverride[] = [],
): KvVectorEditorSuggestion[] {
  if (!definitions || caretPosition < 0 || caretPosition > text.length) {
    return [];
  }
  const resolved = resolveKvVectorEditorInput(
    text,
    definitions,
    displayMode,
    valueOnlyPairOverrides,
  );
  // A valid automatic assignment is still editable: users need suggestions to
  // replace an automatically selected key with the key they intended.
  if (resolved.kind === 'valid' && !resolved.diagnostic) {
    return [];
  }

  const activePairStart = text.lastIndexOf('[', caretPosition - 1);
  const activePairEnd =
    activePairStart < 0 ? -1 : text.indexOf(']', activePairStart);
  if (
    activePairStart >= 0 &&
    activePairStart > text.lastIndexOf(']', caretPosition - 1)
  ) {
    return sortAndLimitSuggestions(
      getKeyValueSuggestions(
        text,
        caretPosition,
        definitions,
        displayMode,
        activePairStart,
        activePairEnd,
      ),
    );
  }

  return sortAndLimitSuggestions(
    getValueOnlySuggestions(
      text,
      caretPosition,
      definitions,
      displayMode,
      text.lastIndexOf(']', caretPosition - 1) + 1,
      valueOnlyPairOverrides,
    ),
  );
}

function getKeyValueSuggestions(
  text: string,
  caretPosition: number,
  definitions: KeyDefinitionResponseDto[],
  displayMode: KvVectorDisplayMode,
  pairStart: number,
  pairEnd: number,
): KvVectorEditorSuggestion[] {
  const prefix = resolveKvVectorEditorInput(
    text.slice(0, pairStart),
    definitions,
    displayMode,
  );
  if (prefix.kind !== 'empty' && prefix.kind !== 'valid') {
    return [];
  }

  const pairContentEnd = pairEnd < 0 ? text.length : pairEnd;
  const colonIndex = text.indexOf(':', pairStart + 1);
  if (
    colonIndex < 0 ||
    colonIndex > pairContentEnd ||
    caretPosition <= colonIndex
  ) {
    return getKeyPositionSuggestions(
      text,
      caretPosition,
      definitions,
      prefix.keyValuePairs,
      pairStart,
      pairEnd,
    );
  }

  return getValuePositionSuggestions(
    text,
    caretPosition,
    definitions,
    prefix.keyValuePairs,
    pairStart,
    pairEnd,
    colonIndex,
  );
}

function getKeyPositionSuggestions(
  text: string,
  caretPosition: number,
  definitions: KeyDefinitionResponseDto[],
  precedingPairs: KeyValue[],
  pairStart: number,
  pairEnd: number,
): KvVectorEditorSuggestion[] {
  const keyPrefix = text.slice(pairStart + 1, caretPosition).trim();
  if (/[:[\]]/.test(keyPrefix)) {
    return [];
  }

  const usedKeySystemIds = new Set(
    precedingPairs.map((pair) => pair.keyInfo.keySystemId),
  );
  const replacementEnd = pairEnd < 0 ? text.length : pairEnd + 1;
  return definitions.flatMap((key) => {
    if (
      usedKeySystemIds.has(key.systemId) ||
      !matchesEditorQuery(key.name, keyPrefix)
    ) {
      return [];
    }

    return key.values.map((value) =>
      createKeyValueSuggestion(key, value, {
        end: replacementEnd,
        start: pairStart,
      }),
    );
  });
}

function getValuePositionSuggestions(
  text: string,
  caretPosition: number,
  definitions: KeyDefinitionResponseDto[],
  precedingPairs: KeyValue[],
  pairStart: number,
  pairEnd: number,
  colonIndex: number,
): KvVectorEditorSuggestion[] {
  const keyName = text.slice(pairStart + 1, colonIndex).trim();
  const key = definitions.find(
    (definition) => definition.name.toLowerCase() === keyName.toLowerCase(),
  );
  const valuePrefix = text.slice(colonIndex + 1, caretPosition).trim();
  if (
    !key ||
    /[[\]:]/.test(valuePrefix) ||
    precedingPairs.some((pair) => pair.keyInfo.keySystemId === key.systemId)
  ) {
    return [];
  }

  const replacementEnd = pairEnd < 0 ? text.length : pairEnd;
  return key.values
    .filter((value) => matchesEditorQuery(value.name, valuePrefix))
    .map((value) => ({
      ...createKeyValueSuggestion(key, value, {
        end: replacementEnd,
        start: colonIndex + 1,
      }),
      insertionText: pairEnd < 0 ? `${value.name}]` : value.name,
    }));
}

function getValueOnlySuggestions(
  text: string,
  caretPosition: number,
  definitions: KeyDefinitionResponseDto[],
  displayMode: KvVectorDisplayMode,
  valueOnlyStart: number,
  valueOnlyPairOverrides: ValueOnlyPairOverride[],
): KvVectorEditorSuggestion[] {
  const precedingText = text.slice(0, valueOnlyStart);
  const valueOnlyText = text.slice(valueOnlyStart);
  if (valueOnlyText.includes('[') || valueOnlyText.includes(']')) {
    return [];
  }
  if (
    valueOnlyStart > 0 &&
    resolveKvVectorEditorInput(precedingText, definitions, displayMode).kind !==
      'valid'
  ) {
    return [];
  }
  if (!isValueOnlySupported(definitions)) {
    return [];
  }

  const replacementRange = getValueOnlyReplacementRange(
    text,
    caretPosition,
    valueOnlyStart,
  );
  const valuePrefix = text
    .slice(replacementRange.start, caretPosition)
    .trim()
    .toLowerCase();
  if (valuePrefix.length === 0) {
    return [];
  }

  const usedKeySystemIds = new Set(
    valueOnlyPairOverrides.map((override) => override.keySystemId),
  );
  const tokenIndex = getValueOnlyTokenIndex(
    text,
    valueOnlyStart,
    replacementRange.start,
  );

  return definitions.flatMap((key) =>
    key.values.flatMap((value) => {
      if (
        usedKeySystemIds.has(key.systemId) ||
        (!matchesEditorQuery(key.name, valuePrefix) &&
          !matchesEditorQuery(value.name, valuePrefix))
      ) {
        return [];
      }

      const suggestion =
        displayMode === 'key-value'
          ? createKeyValueSuggestion(key, value, replacementRange)
          : {
              insertionText: value.name,
              keyLabel: key.name,
              keyNaturalId: key.naturalId,
              keySystemId: key.systemId,
              kind: 'value-only' as const,
              label: `${value.name} (${key.name})`,
              replacementRange,
              valueLabel: value.name,
              valueSystemId: value.systemId,
            };
      const candidateText = applyKvVectorEditorSuggestion(text, suggestion);
      const candidateOverrides = [
        ...valueOnlyPairOverrides.filter(
          (override) => override.tokenIndex !== tokenIndex,
        ),
        {
          keySystemId: key.systemId,
          tokenIndex,
          valueSystemId: value.systemId,
        },
      ];
      // Only offer substitutions that leave the whole candidate unambiguous.
      return resolveKvVectorEditorInput(
        candidateText,
        definitions,
        displayMode,
        candidateOverrides,
      ).kind === 'valid'
        ? [suggestion]
        : [];
    }),
  );
}

function matchesEditorQuery(candidate: string, query: string): boolean {
  return candidate.toLowerCase().includes(query.toLowerCase());
}

function createKeyValueSuggestion(
  key: KeyDefinitionResponseDto,
  value: ValueDefinitionDto,
  replacementRange: {end: number; start: number},
): KvVectorEditorSuggestion {
  return {
    insertionText: `[${key.name}:${value.name}]`,
    keyLabel: key.name,
    keyNaturalId: key.naturalId,
    keySystemId: key.systemId,
    kind: 'key-value-pair',
    label: `[${key.name}:${value.name}]`,
    replacementRange,
    valueLabel: value.name,
    valueSystemId: value.systemId,
  };
}

function getValueOnlyReplacementRange(
  text: string,
  caretPosition: number,
  valueOnlyStart: number,
): {end: number; start: number} {
  const start = Math.max(
    valueOnlyStart,
    text.lastIndexOf('+', caretPosition - 1) + 1,
  );
  const nextSeparator = text.indexOf('+', caretPosition);
  return {end: nextSeparator < 0 ? text.length : nextSeparator, start};
}

function getValueOnlyTokenIndex(
  text: string,
  valueOnlyStart: number,
  tokenStart: number,
): number {
  return text
    .slice(valueOnlyStart, tokenStart)
    .split('+')
    .filter((token) => token.trim() !== '').length;
}

function sortAndLimitSuggestions(
  suggestions: KvVectorEditorSuggestion[],
): KvVectorEditorSuggestion[] {
  return suggestions
    .toSorted((first, second) => {
      if (
        first.valueLabel.localeCompare(second.valueLabel, undefined, {
          sensitivity: 'base',
        }) === 0
      ) {
        const keyPriority = compareKeyPriority(
          first.keyNaturalId,
          first.keySystemId,
          second.keyNaturalId,
          second.keySystemId,
        );
        if (keyPriority !== 0) {
          return keyPriority;
        }
      }
      return first.label.localeCompare(second.label, undefined, {
        sensitivity: 'base',
      });
    })
    .slice(0, 50);
}

/** Converts Selection Panel state into pairs in the user's selection order. */
export function getKvVectorPairsForSelection(
  definitions: KeyDefinitionResponseDto[],
  selectedKeySystemIds: string[],
  selectedValueSystemIdsByKey: Record<string, string>,
): KeyValue[] {
  const definitionsBySystemId = new Map(
    definitions.map((key) => [key.systemId, key]),
  );
  return selectedKeySystemIds.flatMap((keySystemId) => {
    const key = definitionsBySystemId.get(keySystemId);
    if (!key) {
      return [];
    }
    const value = key.values.find(
      (item) => item.systemId === selectedValueSystemIdsByKey[keySystemId],
    );
    return value ? [toKeyValue(key, value)] : [];
  });
}

/** Parses editor text without silently resolving unknown or ambiguous names. */
export function resolveKvVectorEditorInput(
  text: string,
  definitions: KeyDefinitionResponseDto[] | null,
  displayMode: KvVectorDisplayMode = 'value-only',
  valueOnlyPairOverrides: ValueOnlyPairOverride[] = [],
): ResolvedKvVectorInput {
  const normalizedText = normalizeKvVectorEditorText(text);
  if (normalizedText === '') {
    return {keyValuePairs: [], kind: 'empty'};
  }
  if (!definitions) {
    return invalid({code: 'definitions-unavailable', severity: 'error'});
  }

  const pairs: KeyValue[] = [];
  const usedKeySystemIds = new Set<string>();
  let remaining = normalizedText;
  while (remaining.startsWith('[')) {
    const end = remaining.indexOf(']');
    if (end < 0) {
      return incomplete({
        code: 'incomplete-pair',
        fragment: remaining,
        severity: 'hint',
      });
    }
    const fragment = remaining.slice(0, end + 1);
    const token = remaining.slice(1, end);
    if (/[[\]]/.test(token)) {
      return invalid({code: 'malformed-entry', fragment, severity: 'error'});
    }

    const separatorCount = token.match(/:/g)?.length ?? 0;
    if (separatorCount === 0) {
      return invalid({code: 'missing-separator', fragment, severity: 'error'});
    }
    if (separatorCount > 1) {
      return invalid({code: 'extra-separator', fragment, severity: 'error'});
    }

    const separator = token.indexOf(':');
    const keyName = token.slice(0, separator);
    const valueName = token.slice(separator + 1);
    if (keyName === '') {
      return invalid({code: 'missing-key', fragment, severity: 'error'});
    }
    if (valueName === '') {
      return invalid({
        code: 'missing-value',
        fragment,
        keyName,
        severity: 'error',
      });
    }

    const resolvedPair = resolveNamedPair(
      keyName,
      valueName,
      definitions,
      usedKeySystemIds,
    );
    if (resolvedPair.kind === 'invalid') {
      return invalid(resolvedPair.diagnostic);
    }
    pairs.push(resolvedPair.pair);
    usedKeySystemIds.add(resolvedPair.pair.keyInfo.keySystemId);
    remaining = remaining.slice(end + 1);
  }

  if (remaining.length > 0) {
    if (displayMode === 'key-value') {
      return incomplete({
        code: 'incomplete-pair',
        fragment: remaining,
        severity: 'hint',
      });
    }
    if (!isValueOnlySupported(definitions)) {
      return invalid({code: 'value-only-unavailable', severity: 'error'});
    }
    const valueOnlyResult = resolveValueOnlyPairs(
      remaining,
      definitions,
      usedKeySystemIds,
      valueOnlyPairOverrides,
    );
    if (valueOnlyResult.kind === 'incomplete') {
      return incomplete({
        code: 'value-suggestion-pending',
        severity: 'hint',
      });
    }
    if (valueOnlyResult.kind === 'invalid') {
      return invalid(valueOnlyResult.diagnostic);
    }
    pairs.push(...valueOnlyResult.pairs);
    return valueOnlyResult.diagnostic
      ? {
          diagnostic: valueOnlyResult.diagnostic,
          keyValuePairs: pairs,
          kind: 'valid',
        }
      : {keyValuePairs: pairs, kind: 'valid'};
  }

  return {keyValuePairs: pairs, kind: 'valid'};
}

function normalizeKvVectorEditorText(text: string): string {
  // Normalize structural whitespace without discarding typed name whitespace.
  const normalizedSyntax = text
    .replace(/\r\n?/g, '\n')
    .replace(/\n/g, ' ')
    .trim()
    .replace(/\s*([[\]:])\s*/g, '$1');

  let bracketDepth = 0;
  let normalizedText = '';
  for (let index = 0; index < normalizedSyntax.length; index += 1) {
    const character = normalizedSyntax[index];
    if (character === '[') {
      bracketDepth += 1;
    } else if (character === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
    }

    if (character !== '+' || bracketDepth > 0) {
      normalizedText += character;
      continue;
    }

    normalizedText = normalizedText.trimEnd();
    normalizedText += character;
    while (/\s/.test(normalizedSyntax[index + 1] ?? '')) {
      index += 1;
    }
  }
  return normalizedText;
}

function incomplete(
  diagnostic: KvVectorEditorDiagnostic,
): ResolvedKvVectorInput {
  return {diagnostic, keyValuePairs: [], kind: 'incomplete'};
}

function invalid(diagnostic: KvVectorEditorDiagnostic): ResolvedKvVectorInput {
  return {diagnostic, keyValuePairs: [], kind: 'invalid'};
}

function isValueOnlySupported(
  definitions: KeyDefinitionResponseDto[],
): boolean {
  // '+' is the value-only delimiter, so those definitions require brackets.
  return !definitions.some(
    (key) =>
      key.name.includes('+') ||
      key.values.some((value) => value.name.includes('+')),
  );
}

function resolveNamedPair(
  keyName: string,
  valueName: string,
  definitions: KeyDefinitionResponseDto[],
  usedKeySystemIds: ReadonlySet<string>,
):
  | {diagnostic: KvVectorEditorDiagnostic; kind: 'invalid'}
  | {kind: 'valid'; pair: KeyValue} {
  const matchingKeys = definitions.filter(
    (key) => key.name.toLowerCase() === keyName.toLowerCase(),
  );
  if (matchingKeys.length === 0) {
    return {
      diagnostic: {code: 'unknown-key', keyName, severity: 'error'},
      kind: 'invalid',
    };
  }
  if (matchingKeys.length > 1) {
    return {
      diagnostic: {code: 'ambiguous-key', keyName, severity: 'error'},
      kind: 'invalid',
    };
  }
  const [key] = matchingKeys;
  if (usedKeySystemIds.has(key.systemId)) {
    return {
      diagnostic: {
        code: 'duplicate-key',
        keyName: key.name,
        severity: 'error',
      },
      kind: 'invalid',
    };
  }
  const matchingValues = key.values.filter(
    (value) => value.name.toLowerCase() === valueName.toLowerCase(),
  );
  if (matchingValues.length === 0) {
    return {
      diagnostic: {
        code: 'unknown-value',
        keyName: key.name,
        severity: 'error',
        valueName,
      },
      kind: 'invalid',
    };
  }
  if (matchingValues.length > 1) {
    return {
      diagnostic: {
        code: 'ambiguous-value',
        keyName: key.name,
        severity: 'error',
        valueName,
      },
      kind: 'invalid',
    };
  }
  return {kind: 'valid', pair: toKeyValue(key, matchingValues[0])};
}

function resolveValueOnlyPairs(
  text: string,
  definitions: KeyDefinitionResponseDto[],
  usedKeySystemIds: ReadonlySet<string>,
  valueOnlyPairOverrides: ValueOnlyPairOverride[],
):
  | {kind: 'incomplete'}
  | {diagnostic: KvVectorEditorDiagnostic; kind: 'invalid'}
  | {
      diagnostic?: KvVectorEditorDiagnostic;
      kind: 'valid';
      pairs: KeyValue[];
    } {
  if (/[[\]]/.test(text)) {
    return {
      diagnostic: {code: 'malformed-entry', fragment: text, severity: 'error'},
      kind: 'invalid',
    };
  }

  const hasTrailingSeparator = text.endsWith('+');
  const tokens = text.split('+');
  if (hasTrailingSeparator) {
    tokens.pop();
  }
  if (tokens.length === 0 || tokens.some((token) => token === '')) {
    return {
      diagnostic: {
        code: 'empty-value-token',
        fragment: text,
        severity: 'error',
      },
      kind: 'invalid',
    };
  }
  const missingBracketsToken = tokens.find((token) => token.includes(':'));
  if (missingBracketsToken) {
    return {
      diagnostic: {
        code: 'missing-brackets',
        fragment: missingBracketsToken,
        severity: 'error',
      },
      kind: 'invalid',
    };
  }

  const candidatesByToken: ValueOnlyPairCandidate[][] = [];
  const candidateCountsByToken: number[] = [];
  // Normalize resolver priority independently of API array order.
  const orderedDefinitions = [...definitions].sort((left, right) =>
    compareKeyPriority(
      left.naturalId,
      left.systemId,
      right.naturalId,
      right.systemId,
    ),
  );
  for (const [index, token] of tokens.entries()) {
    const candidates: ValueOnlyPairCandidate[] = [];
    const usedMatchingKeys: KeyDefinitionResponseDto[] = [];
    for (const key of orderedDefinitions) {
      const matchingValues = key.values.filter(
        (value) => value.name.toLowerCase() === token.toLowerCase(),
      );
      if (matchingValues.length > 1) {
        return {
          diagnostic: {
            code: 'ambiguous-value',
            keyName: key.name,
            severity: 'error',
            valueName: token,
          },
          kind: 'invalid',
        };
      }
      if (matchingValues.length === 1) {
        if (usedKeySystemIds.has(key.systemId)) {
          usedMatchingKeys.push(key);
        } else {
          candidates.push({key, pair: toKeyValue(key, matchingValues[0])});
        }
      }
    }
    if (candidates.length === 0) {
      if (usedMatchingKeys.length > 0) {
        return {
          diagnostic: {
            code: 'used-key-conflict',
            keyName: usedMatchingKeys[0].name,
            severity: 'error',
            valueName: token,
          },
          kind: 'invalid',
        };
      }
      return {
        diagnostic: {
          code: 'unknown-value-token',
          severity: 'error',
          valueName: token,
        },
        kind: 'invalid',
      };
    }
    if (
      index === tokens.length - 1 &&
      !hasTrailingSeparator &&
      hasCompetingValueOnlyMatch(token, definitions, usedKeySystemIds)
    ) {
      // Keep an exact prefix editable while a longer definition also matches.
      return {kind: 'incomplete'};
    }
    const override = valueOnlyPairOverrides.find(
      (item) => item.tokenIndex === index,
    );
    if (override) {
      const explicitCandidate = candidates.find(
        (candidate) =>
          candidate.key.systemId === override.keySystemId &&
          candidate.pair.valueInfo.valueSystemId === override.valueSystemId,
      );
      if (!explicitCandidate) {
        return {
          diagnostic: {
            code: 'used-key-conflict',
            keyName: override.keySystemId,
            severity: 'error',
            valueName: token,
          },
          kind: 'invalid',
        };
      }
      candidateCountsByToken.push(candidates.length);
      candidatesByToken.push([explicitCandidate]);
      continue;
    }

    candidateCountsByToken.push(candidates.length);
    candidatesByToken.push(candidates);
  }

  const pairs = findDistinctKeyAssignment(candidatesByToken);
  if (!pairs) {
    return {
      diagnostic: {
        candidateKeyNames: [
          ...new Set(
            candidatesByToken.flatMap((candidates) =>
              candidates.map(({key}) => key.name),
            ),
          ),
        ],
        code: 'value-only-no-distinct-key-assignment',
        severity: 'error',
        valueNames: tokens,
      },
      kind: 'invalid',
    };
  }

  const resolutionsByValueName = new Map<
    string,
    {candidateKeyNames: string[]; resolvedKeyNames: string[]; valueName: string}
  >();
  for (const [index, candidates] of candidatesByToken.entries()) {
    if (candidateCountsByToken[index] < 2 || candidates.length === 1) {
      continue;
    }
    const valueName = tokens[index];
    const resolution = resolutionsByValueName.get(valueName) ?? {
      candidateKeyNames: candidates.map(({key}) => key.name),
      resolvedKeyNames: [],
      valueName,
    };
    resolution.resolvedKeyNames.push(pairs[index].keyInfo.keyLabel);
    resolutionsByValueName.set(valueName, resolution);
  }

  return resolutionsByValueName.size > 0
    ? {
        diagnostic: {
          code: 'value-only-auto-resolved',
          resolutions: [...resolutionsByValueName.values()],
          severity: 'warning',
        },
        kind: 'valid',
        pairs,
      }
    : {kind: 'valid', pairs};
}

interface ValueOnlyPairCandidate {
  key: KeyDefinitionResponseDto;
  pair: KeyValue;
}

function compareKeyPriority(
  firstNaturalId: number,
  firstSystemId: string,
  secondNaturalId: number,
  secondSystemId: string,
): number {
  const naturalIdDifference = firstNaturalId - secondNaturalId;
  if (naturalIdDifference !== 0) {
    return naturalIdDifference;
  }
  if (firstSystemId < secondSystemId) {
    return -1;
  }
  return firstSystemId > secondSystemId ? 1 : 0;
}

/** Finds one deterministic key-per-token matching without sacrificing a later token. */
function findDistinctKeyAssignment(
  candidatesByToken: ValueOnlyPairCandidate[][],
): KeyValue[] | null {
  const assignedPairs: KeyValue[] = [];

  const assignToken = (tokenIndex: number, usedKeySystemIds: Set<string>) => {
    if (tokenIndex === candidatesByToken.length) {
      return true;
    }
    for (const candidate of candidatesByToken[tokenIndex]) {
      if (usedKeySystemIds.has(candidate.key.systemId)) {
        continue;
      }
      usedKeySystemIds.add(candidate.key.systemId);
      assignedPairs.push(candidate.pair);
      if (assignToken(tokenIndex + 1, usedKeySystemIds)) {
        return true;
      }
      assignedPairs.pop();
      usedKeySystemIds.delete(candidate.key.systemId);
    }
    return false;
  };

  return assignToken(0, new Set()) ? assignedPairs : null;
}

function hasCompetingValueOnlyMatch(
  token: string,
  definitions: KeyDefinitionResponseDto[],
  usedKeySystemIds: ReadonlySet<string>,
): boolean {
  const normalizedToken = token.toLowerCase();
  return definitions.some(
    (key) =>
      !usedKeySystemIds.has(key.systemId) &&
      key.values.some(
        (value) =>
          value.name.length > token.length &&
          value.name.toLowerCase().includes(normalizedToken),
      ),
  );
}

function toKeyValue(
  key: KeyDefinitionResponseDto,
  value: ValueDefinitionDto,
): KeyValue {
  return {
    keyInfo: {
      keyId: key.naturalId,
      keyLabel: key.name,
      keySystemId: key.systemId,
    },
    valueInfo: {
      valueId: value.naturalId,
      valueLabel: value.name,
      valueSystemId: value.systemId,
    },
  };
}
