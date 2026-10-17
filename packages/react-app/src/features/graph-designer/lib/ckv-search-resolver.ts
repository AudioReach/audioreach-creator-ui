/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  compareKeyPriority,
  findDistinctKeyAssignment,
  type KeyPriorityCandidate,
} from '~shared/lib/distinct-key-assignment';
import type {
  GraphKey,
  KeyValue,
} from '~shared/types/key-configurator-config.types';

/**
 * Defines CKV search as a pure token language: every calibration key stays
 * selectable at once (requirement 8), so bare value tokens are resolved
 * against the entire key set rather than locked to one key, unlike SGKV's
 * bracket-syntax editor.
 */
export interface CkvSearchSuggestion {
  key: GraphKey;
  kind: 'key' | 'value';
  label: string;
  value: KeyValue;
}

export type CkvSearchDiagnostic =
  | {
      candidateKeyNames: string[];
      code: 'value-auto-resolved-by-key-id';
      severity: 'warning';
      valueName: string;
    }
  | {code: 'unknown-token'; severity: 'error'; token: string}
  | {
      candidateKeyNames: string[];
      code: 'no-distinct-key-assignment';
      severity: 'error';
      tokens: string[];
    };

export interface ResolvedCkvSearchInput {
  diagnostics: CkvSearchDiagnostic[];
  resolved: Array<{key: GraphKey; value: KeyValue}>;
}

interface CkvValueCandidate {
  key: GraphKey;
  value: KeyValue;
}

type SuggestionMatchRank = 0 | 1 | 2;

interface RankedSuggestion {
  rank: SuggestionMatchRank;
  suggestion: CkvSearchSuggestion;
}

/** Returns every suggestion ranked ahead of value suggestions at a tie. */
export function getCkvSearchSuggestions(
  availableCalibrationKeys: Record<string, GraphKey>,
  searchTerm: string,
): CkvSearchSuggestion[] {
  const rankedSuggestions: RankedSuggestion[] = [];

  for (const key of Object.values(availableCalibrationKeys)) {
    const keyRank = getSuggestionMatchRank(key.name, searchTerm);
    for (const value of key.values) {
      if (keyRank !== null) {
        rankedSuggestions.push({
          rank: keyRank,
          suggestion: {
            key,
            kind: 'key',
            label: `${key.name}: ${value.name}`,
            value,
          },
        });
      }
      const valueRank = getSuggestionMatchRank(value.name, searchTerm);
      if (valueRank !== null) {
        rankedSuggestions.push({
          rank: valueRank,
          suggestion: {
            key,
            kind: 'value',
            label: `${value.name} (${key.name})`,
            value,
          },
        });
      }
    }
  }

  return rankedSuggestions
    .toSorted(compareRankedSuggestions)
    .map(({suggestion}) => suggestion);
}

/** Resolves committed tokens or reports why a token can't resolve to one key. */
export function resolveCkvSearchInput(
  availableCalibrationKeys: Record<string, GraphKey>,
  rawTokens: string[],
): ResolvedCkvSearchInput {
  const flatCandidates = flattenCalibrationKeyValues(availableCalibrationKeys);
  const diagnostics: CkvSearchDiagnostic[] = [];
  const resolvableTokens: string[] = [];
  const candidatesByToken: KeyPriorityCandidate<CkvValueCandidate>[][] = [];

  for (const token of rawTokens) {
    const matches = flatCandidates.filter(
      (candidate) => candidate.value.name.toLowerCase() === token.toLowerCase(),
    );
    if (matches.length === 0) {
      diagnostics.push({code: 'unknown-token', severity: 'error', token});
      continue;
    }

    resolvableTokens.push(token);
    candidatesByToken.push(
      matches
        .map((candidate) => ({
          key: {naturalId: candidate.key.id, systemId: candidate.key.systemId},
          pair: candidate,
        }))
        .toSorted((first, second) =>
          compareKeyPriority(
            first.key.naturalId,
            first.key.systemId,
            second.key.naturalId,
            second.key.systemId,
          ),
        ),
    );
  }

  const assignment = findDistinctKeyAssignment(candidatesByToken);
  if (!assignment) {
    return {
      diagnostics: [
        ...diagnostics,
        {
          candidateKeyNames: getUniqueCandidateKeyNames(candidatesByToken),
          code: 'no-distinct-key-assignment',
          severity: 'error',
          tokens: resolvableTokens,
        },
      ],
      resolved: [],
    };
  }

  for (const [index, candidates] of candidatesByToken.entries()) {
    if (candidates.length < 2) {
      continue;
    }
    diagnostics.push({
      candidateKeyNames: candidates.map(({pair}) => pair.key.name),
      code: 'value-auto-resolved-by-key-id',
      severity: 'warning',
      valueName: resolvableTokens[index],
    });
  }

  return {
    diagnostics,
    resolved: assignment.map((candidate) => ({
      key: candidate.key,
      value: candidate.value,
    })),
  };
}

function flattenCalibrationKeyValues(
  availableCalibrationKeys: Record<string, GraphKey>,
): CkvValueCandidate[] {
  return Object.values(availableCalibrationKeys).flatMap((key) =>
    key.values.map((value) => ({key, value})),
  );
}

function getSuggestionMatchRank(
  name: string,
  searchTerm: string,
): SuggestionMatchRank | null {
  const normalizedName = name.toLowerCase();
  const normalizedTerm = searchTerm.toLowerCase();
  if (normalizedName === normalizedTerm) {
    return 0;
  }
  if (normalizedName.startsWith(normalizedTerm)) {
    return 1;
  }
  return normalizedName.includes(normalizedTerm) ? 2 : null;
}

function compareRankedSuggestions(
  first: RankedSuggestion,
  second: RankedSuggestion,
): number {
  if (first.rank !== second.rank) {
    return first.rank - second.rank;
  }
  if (first.suggestion.kind !== second.suggestion.kind) {
    return first.suggestion.kind === 'key' ? -1 : 1;
  }
  return first.suggestion.label.localeCompare(
    second.suggestion.label,
    undefined,
    {
      sensitivity: 'base',
    },
  );
}

function getUniqueCandidateKeyNames(
  candidatesByToken: KeyPriorityCandidate<CkvValueCandidate>[][],
): string[] {
  return [
    ...new Set(
      candidatesByToken.flatMap((candidates) =>
        candidates.map(({pair}) => pair.key.name),
      ),
    ),
  ];
}
