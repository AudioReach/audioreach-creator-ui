/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {KeyDisplayMode} from '~shared/lib/key-display-mode';
import type {
  Key,
  KeyValue,
  TagGroup,
} from '~shared/types/key-configurator-config.types';

/**
 * Every selection originates from a table click on a known {key, value}
 * object, so unlike SGKV's bracket/+ parser this never needs backtracking:
 * TKV locks to a single tag group (requirement 10) before ambiguity can
 * grow past "which key owns this value name," which the lowest key id
 * resolves outright.
 */
export interface TkvSearchSuggestion {
  key: Key;
  value: KeyValue;
}

export type TkvSearchDiagnostic = {
  candidateKeyNames: string[];
  code: 'value-auto-resolved-by-key-id';
  severity: 'warning';
  valueName: string;
};

export type ResolvedTkvSearchInput =
  | {kind: 'empty'}
  | {kind: 'query'; queryText: string}
  | {
      kind: 'selection';
      pairs: Array<{key: Key; value: KeyValue}>;
      queryText: string;
    }
  | {
      diagnostic: TkvSearchDiagnostic;
      kind: 'ambiguous';
      pairs: Array<{key: Key; value: KeyValue}>;
      queryText: string;
    };

interface TkvCandidate {
  key: Key;
  value: KeyValue;
}

type SuggestionMatchRank = 0 | 1 | 2;

interface RankedSuggestion {
  rank: SuggestionMatchRank;
  suggestion: TkvSearchSuggestion;
}

interface TokenResolution {
  consumedLength: number;
  diagnostic?: TkvSearchDiagnostic;
  pair: {key: Key; value: KeyValue};
}

/** Returns every in-scope suggestion ranked by match quality, then by name. */
export function getTkvSearchSuggestions(
  queryText: string,
  availableModuleTagsInfo: Record<string, TagGroup>,
  lockedTagGroupId: number | null,
  displayMode: KeyDisplayMode,
): TkvSearchSuggestion[] {
  const candidates = getScopedCandidates(
    availableModuleTagsInfo,
    lockedTagGroupId,
  );
  const rankedSuggestions: RankedSuggestion[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const rank = getCandidateMatchRank(candidate, queryText, displayMode);
    if (rank === null) {
      continue;
    }
    const dedupeKey = `${candidate.key.id}:${candidate.value.id}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    rankedSuggestions.push({
      rank,
      suggestion: {key: candidate.key, value: candidate.value},
    });
  }

  return rankedSuggestions
    .toSorted(compareRankedSuggestions)
    .map(({suggestion}) => suggestion);
}

/** Re-parses the whole search box text into confirmed pairs plus a query. */
export function resolveTkvSearchInput(
  text: string,
  availableModuleTagsInfo: Record<string, TagGroup>,
  lockedTagGroupId: number | null,
  displayMode: KeyDisplayMode,
): ResolvedTkvSearchInput {
  const trimmed = text.trim();
  if (trimmed === '') {
    return {kind: 'empty'};
  }

  const candidates = getScopedCandidates(
    availableModuleTagsInfo,
    lockedTagGroupId,
  );

  const pairs: Array<{key: Key; value: KeyValue}> = [];
  let lastDiagnostic: TkvSearchDiagnostic | undefined;
  let remaining = trimmed;

  while (remaining.length > 0) {
    const resolution =
      displayMode === 'value-only'
        ? resolveNextValueOnlyToken(remaining, candidates)
        : resolveNextKeyValueToken(remaining, candidates);
    if (!resolution) {
      break;
    }
    pairs.push(resolution.pair);
    if (resolution.diagnostic) {
      lastDiagnostic = resolution.diagnostic;
    }
    remaining = remaining.slice(resolution.consumedLength);
  }

  if (pairs.length === 0) {
    return {kind: 'query', queryText: remaining};
  }
  if (lastDiagnostic) {
    return {
      diagnostic: lastDiagnostic,
      kind: 'ambiguous',
      pairs,
      queryText: remaining,
    };
  }
  return {kind: 'selection', pairs, queryText: remaining};
}

function getScopedCandidates(
  availableModuleTagsInfo: Record<string, TagGroup>,
  lockedTagGroupId: number | null,
): TkvCandidate[] {
  const tagGroups =
    lockedTagGroupId === null
      ? Object.values(availableModuleTagsInfo)
      : Object.values(availableModuleTagsInfo).filter(
          (tagGroup) => tagGroup.id === lockedTagGroupId,
        );

  return tagGroups.flatMap((tagGroup) =>
    Object.values(tagGroup.keys).flatMap((key) =>
      key.values.map((value) => ({key, value})),
    ),
  );
}

function resolveNextValueOnlyToken(
  remaining: string,
  candidates: TkvCandidate[],
): TokenResolution | null {
  const separatorIndex = remaining.indexOf('+');
  const token =
    separatorIndex < 0 ? remaining : remaining.slice(0, separatorIndex);
  const consumedLength =
    separatorIndex < 0 ? remaining.length : separatorIndex + 1;

  const matches = findLowestKeyIdMatches(candidates, token);
  if (matches.length === 0) {
    return null;
  }

  const [bestMatch, ...otherMatches] = matches;
  return {
    consumedLength,
    diagnostic:
      otherMatches.length > 0
        ? {
            candidateKeyNames: matches.map(({key}) => key.name),
            code: 'value-auto-resolved-by-key-id',
            severity: 'warning',
            valueName: token,
          }
        : undefined,
    pair: bestMatch,
  };
}

function resolveNextKeyValueToken(
  remaining: string,
  candidates: TkvCandidate[],
): TokenResolution | null {
  if (!remaining.startsWith('[')) {
    return null;
  }
  const closingIndex = remaining.indexOf(']');
  if (closingIndex < 0) {
    return null;
  }

  const token = remaining.slice(1, closingIndex);
  const separatorIndex = token.indexOf(':');
  if (separatorIndex < 0) {
    return null;
  }

  const keyName = token.slice(0, separatorIndex).trim();
  const valueName = token.slice(separatorIndex + 1).trim();
  const keyScopedCandidates = candidates.filter(
    (candidate) => candidate.key.name.toLowerCase() === keyName.toLowerCase(),
  );
  const matches = findLowestKeyIdMatches(keyScopedCandidates, valueName);
  if (matches.length === 0) {
    return null;
  }

  let consumedLength = closingIndex + 1;
  if (remaining[consumedLength] === ' ') {
    consumedLength += 1;
  }

  const [bestMatch, ...otherMatches] = matches;
  return {
    consumedLength,
    diagnostic:
      otherMatches.length > 0
        ? {
            candidateKeyNames: matches.map(({key}) => key.name),
            code: 'value-auto-resolved-by-key-id',
            severity: 'warning',
            valueName,
          }
        : undefined,
    pair: bestMatch,
  };
}

function findLowestKeyIdMatches(
  candidates: TkvCandidate[],
  valueName: string,
): TkvCandidate[] {
  const normalizedValueName = valueName.toLowerCase();
  return candidates
    .filter(
      (candidate) => candidate.value.name.toLowerCase() === normalizedValueName,
    )
    .toSorted((first, second) => first.key.id - second.key.id);
}

function getCandidateMatchRank(
  candidate: TkvCandidate,
  queryText: string,
  displayMode: KeyDisplayMode,
): SuggestionMatchRank | null {
  const valueRank = getSuggestionMatchRank(candidate.value.name, queryText);
  if (displayMode === 'value-only') {
    return valueRank;
  }

  const keyRank = getSuggestionMatchRank(candidate.key.name, queryText);
  if (valueRank === null) {
    return keyRank;
  }
  if (keyRank === null) {
    return valueRank;
  }
  return Math.min(valueRank, keyRank) as SuggestionMatchRank;
}

function getSuggestionMatchRank(
  name: string,
  queryText: string,
): SuggestionMatchRank | null {
  const normalizedName = name.toLowerCase();
  const normalizedQuery = queryText.toLowerCase();
  if (normalizedName === normalizedQuery) {
    return 0;
  }
  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }
  return normalizedName.includes(normalizedQuery) ? 2 : null;
}

function compareRankedSuggestions(
  first: RankedSuggestion,
  second: RankedSuggestion,
): number {
  if (first.rank !== second.rank) {
    return first.rank - second.rank;
  }
  const firstLabel = `${first.suggestion.value.name} (${first.suggestion.key.name})`;
  const secondLabel = `${second.suggestion.value.name} (${second.suggestion.key.name})`;
  return firstLabel.localeCompare(secondLabel, undefined, {
    sensitivity: 'base',
  });
}
