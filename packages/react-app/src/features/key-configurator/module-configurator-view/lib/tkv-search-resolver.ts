/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {tokenizeKvSearchInput} from '~features/key-configurator/module-configurator-view/lib/tokenize-kv-search-input';
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
      tagGroupId: number | null;
    }
  | {
      diagnostic: TkvSearchDiagnostic;
      kind: 'ambiguous';
      pairs: Array<{key: Key; value: KeyValue}>;
      queryText: string;
      tagGroupId: number | null;
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

/** Returns every in-scope suggestion ranked by match quality, then by name. */
export function getTkvSearchSuggestions(
  queryText: string,
  availableModuleTagsInfo: Record<string, TagGroup>,
  lockedTagGroupId: number | null,
): TkvSearchSuggestion[] {
  const candidates = getScopedCandidates(
    availableModuleTagsInfo,
    lockedTagGroupId,
  );
  const rankedSuggestions: RankedSuggestion[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const valueRank = getSuggestionMatchRank(candidate.value.name, queryText);
    const keyRank = getSuggestionMatchRank(candidate.key.name, queryText);
    const rank =
      valueRank === null
        ? keyRank
        : keyRank === null
          ? valueRank
          : (Math.min(valueRank, keyRank) as SuggestionMatchRank);
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

/**
 * Resolves every token in the search box independently (mirroring CKV's
 * resolver), narrowing the effective tag-group lock as each token resolves
 * so a fully copy-pasted multi-token string (e.g. `[Mute: Off] [Mute: On]`)
 * and an incrementally-typed compound search (e.g. `Off+On`) resolve the
 * same way. Tokens that don't resolve are preserved, in order, as
 * `queryText` — both for display and as the live suggestion query.
 */
export function resolveTkvSearchInput(
  text: string,
  availableModuleTagsInfo: Record<string, TagGroup>,
  lockedTagGroupId: number | null,
): ResolvedTkvSearchInput {
  const trimmed = text.trim();
  if (trimmed === '') {
    return {kind: 'empty'};
  }

  const pairs: Array<{key: Key; value: KeyValue}> = [];
  const unresolvedTokens: string[] = [];
  let effectiveLockedTagGroupId = lockedTagGroupId;
  let lastDiagnostic: TkvSearchDiagnostic | undefined;

  for (const token of tokenizeKvSearchInput(trimmed)) {
    const bracketTagName = parseBracketTagNameToken(token);
    if (bracketTagName !== null) {
      const tagGroup = findTagGroupByName(
        availableModuleTagsInfo,
        bracketTagName,
        effectiveLockedTagGroupId,
      );
      if (tagGroup) {
        effectiveLockedTagGroupId = tagGroup.id;
      } else {
        unresolvedTokens.push(token);
      }
      continue;
    }

    const bracketPair = parseBracketKeyValueToken(token);
    if (bracketPair) {
      const candidates = getScopedCandidates(
        availableModuleTagsInfo,
        effectiveLockedTagGroupId,
      ).filter(
        (candidate) =>
          candidate.key.name.toLowerCase() ===
          bracketPair.keyName.toLowerCase(),
      );
      const resolution = resolveValueAmongCandidates(
        candidates,
        bracketPair.valueName,
      );
      if (!resolution) {
        unresolvedTokens.push(token);
        continue;
      }
      pairs.push(resolution.pair);
      effectiveLockedTagGroupId =
        resolveTagGroupIdForKey(availableModuleTagsInfo, resolution.pair.key.id) ??
        effectiveLockedTagGroupId;
      lastDiagnostic = resolution.diagnostic ?? lastDiagnostic;
      continue;
    }

    const tagGroupMatch =
      effectiveLockedTagGroupId === null
        ? findTagGroupByName(availableModuleTagsInfo, token, null)
        : null;
    if (tagGroupMatch) {
      effectiveLockedTagGroupId = tagGroupMatch.id;
      continue;
    }

    const scopedCandidates = getScopedCandidates(
      availableModuleTagsInfo,
      effectiveLockedTagGroupId,
    );
    const resolution = resolveValueAmongCandidates(scopedCandidates, token);
    if (!resolution) {
      unresolvedTokens.push(token);
      continue;
    }
    pairs.push(resolution.pair);
    effectiveLockedTagGroupId =
      resolveTagGroupIdForKey(availableModuleTagsInfo, resolution.pair.key.id) ??
      effectiveLockedTagGroupId;
    lastDiagnostic = resolution.diagnostic ?? lastDiagnostic;
  }

  const queryText = unresolvedTokens.join(' ');
  const resolvedSomething =
    pairs.length > 0 || effectiveLockedTagGroupId !== lockedTagGroupId;

  if (!resolvedSomething) {
    return {kind: 'query', queryText};
  }
  if (lastDiagnostic) {
    return {
      diagnostic: lastDiagnostic,
      kind: 'ambiguous',
      pairs,
      queryText,
      tagGroupId: effectiveLockedTagGroupId,
    };
  }
  return {
    kind: 'selection',
    pairs,
    queryText,
    tagGroupId: effectiveLockedTagGroupId,
  };
}

/** Finds which tag group owns a key id, for narrowing the lock as pairs resolve. */
export function resolveTagGroupIdForKey(
  availableModuleTagsInfo: Record<string, TagGroup>,
  keyId: number,
): number | null {
  const tagGroup = Object.values(availableModuleTagsInfo).find((candidate) =>
    Object.values(candidate.keys).some((key) => key.id === keyId),
  );
  return tagGroup?.id ?? null;
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

function resolveValueAmongCandidates(
  candidates: TkvCandidate[],
  valueName: string,
): {diagnostic?: TkvSearchDiagnostic; pair: TkvCandidate} | null {
  const matches = findLowestKeyIdMatches(candidates, valueName);
  if (matches.length === 0) {
    return null;
  }
  const [bestMatch, ...otherMatches] = matches;
  return {
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

function findTagGroupByName(
  availableModuleTagsInfo: Record<string, TagGroup>,
  name: string,
  effectiveLockedTagGroupId: number | null,
): TagGroup | null {
  const normalizedName = name.toLowerCase();
  const match = Object.values(availableModuleTagsInfo).find(
    (tagGroup) => tagGroup.name.toLowerCase() === normalizedName,
  );
  if (!match) {
    return null;
  }
  if (
    effectiveLockedTagGroupId !== null &&
    effectiveLockedTagGroupId !== match.id
  ) {
    return null;
  }
  return match;
}

function parseBracketKeyValueToken(
  token: string,
): {keyName: string; valueName: string} | null {
  if (!token.startsWith('[') || !token.endsWith(']')) {
    return null;
  }
  const inner = token.slice(1, -1);
  const separatorIndex = inner.indexOf(':');
  if (separatorIndex < 0) {
    return null;
  }
  return {
    keyName: inner.slice(0, separatorIndex).trim(),
    valueName: inner.slice(separatorIndex + 1).trim(),
  };
}

function parseBracketTagNameToken(token: string): string | null {
  if (!token.startsWith('[') || !token.endsWith(']')) {
    return null;
  }
  const inner = token.slice(1, -1);
  return inner.includes(':') ? null : inner.trim();
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
