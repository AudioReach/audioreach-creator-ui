/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  GraphKey,
  Key,
  KeyValue,
  SortColumn,
  SortOrder,
} from '~shared/types/key-configurator-config.types';

/**
 * Determines whether a calibration/voice key or any of its values match the given search term.
 *
 * A match occurs when the key name or key ID matches the search term, or when any of the
 * key's values match by name or ID. Numeric search terms are compared against IDs directly.
 *
 * @param keyName - The display name of the key.
 * @param key - The key object containing its ID and associated values.
 * @param searchTerm - The raw string entered by the user in the search bar.
 * @param searchNumber - The numeric representation of `searchTerm`, or `null` if it is not a valid number.
 * @returns `true` if the key or any of its values match the search term; otherwise `false`.
 */
export function matchesSearchTerm(
  keyName: string,
  key: GraphKey,
  searchTerm: string,
  searchNumber: number | null,
): boolean {
  const keyMatches =
    keyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (searchNumber !== null && key.id === searchNumber);
  const valueMatches = key.values.some(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (searchNumber !== null && v.id === searchNumber),
  );
  return keyMatches || valueMatches;
}

/**
 * Isolates the token currently being typed out of a filter/search string that
 * may contain already-resolved tokens (e.g. `[Volume: Level_0] voi` once a
 * prior token has resolved) — mirrors SGKV's caret-based active token
 * isolation (`getValueOnlyReplacementRange`) without needing caret tracking,
 * since this editor only supports appending at the end. Both ` ` and the
 * legacy `+` join character are treated as boundaries, so a stray `+` never
 * gets folded into the token being matched against key/value names.
 */
export function getActiveSearchToken(text: string): string {
  const separatorIndex = Math.max(text.lastIndexOf(' '), text.lastIndexOf('+'));
  return separatorIndex < 0
    ? text.trim()
    : text.slice(separatorIndex + 1).trim();
}

/**
 * Returns a sorted copy of the provided key-name array based on the active sort column and order.
 *
 * When `sortColumn` is `null` the original order is preserved. Sorting by `'id'` compares
 * numeric key IDs, while sorting by `'name'` performs a locale-aware, case-insensitive
 * string comparison.
 *
 * @param keys - Array of key names to sort.
 * @param keyData - Map from key name to its {@link GraphKey} data.
 * @param sortColumn - The column to sort by (`'id'`, `'name'`, or `null` for no sort).
 * @param sortOrder - The direction of the sort: `'asc'` for ascending or `'desc'` for descending.
 * @returns A new sorted array of key names; the original array is not mutated.
 */
export function sortKeys(
  keys: string[],
  keyData: Record<string, GraphKey>,
  sortColumn: SortColumn,
  sortOrder: SortOrder,
): string[] {
  if (!sortColumn) {
    return keys;
  }

  return [...keys].sort((a, b) => {
    let comparison: number;
    if (sortColumn === 'id') {
      comparison = keyData[a].id - keyData[b].id;
    } else {
      comparison = a.toLowerCase().localeCompare(b.toLowerCase());
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

/**
 * Reorders the key-name array so that keys with at least one selected value appear first.
 *
 * Keys that have one or more values currently selected are moved to the front of the list,
 * while keys with no selected values follow. The relative order within each group is
 * preserved.
 *
 * @param keys - Array of key names to partition.
 * @param keyData - Map from key name to its {@link GraphKey} data.
 * @param selectedKeyValues - Nested map of `keyId → valueId → isSelected` representing the current selection state.
 * @returns A new array with keys that have selected values placed before those that do not.
 */
export function partitionKeysBySelection(
  keys: string[],
  keyData: Record<string, GraphKey>,
  selectedKeyValues: Record<number, Record<number, boolean>>,
): string[] {
  const keysWithSelectedValues = keys.filter((keyName) => {
    const key = keyData[keyName];
    const keySelections = selectedKeyValues[key.id];
    return keySelections && key.values.some((v) => keySelections[v.id]);
  });
  const keysWithoutSelectedValues = keys.filter((keyName) => {
    const key = keyData[keyName];
    const keySelections = selectedKeyValues[key.id];
    return !keySelections || !key.values.some((v) => keySelections[v.id]);
  });
  return [...keysWithSelectedValues, ...keysWithoutSelectedValues];
}

/**
 * Computes the Cartesian product of the selected values across all keys.
 *
 * Each element of the returned array is one unique combination of key-value pairs — one
 * pair per key — covering every possible permutation of the selected values.
 *
 * @param selectedPerKey - Array where each entry contains a key and the list
 *   of values selected for that key.
 * @returns A two-dimensional array of key-value pair combinations representing the full
 *   Cartesian product of the selections.
 */
export function generateCartesianProduct(
  selectedPerKey: Array<{
    key: Key;
    values: Array<{id: number; name: string}>;
  }>,
): Array<
  Array<{
    key: Key;
    value: {id: number; name: string};
  }>
> {
  const combinations: Array<
    Array<{
      key: Key;
      value: {id: number; name: string};
    }>
  > = [];

  const generate = (
    index: number,
    currentCombo: Array<{
      key: Key;
      value: {id: number; name: string};
    }>,
  ) => {
    if (index === selectedPerKey.length) {
      combinations.push([...currentCombo]);
      return;
    }

    const {key, values} = selectedPerKey[index];
    values.forEach((value) => {
      currentCombo.push({key, value});
      generate(index + 1, currentCombo);
      currentCombo.pop();
    });
  };

  generate(0, []);
  return combinations;
}

/**
 * Transforms the flat selection state map into a structured list grouped by key.
 *
 * Iterates over every key ID present in `selectedKeyValues`, resolves the corresponding
 * key name from `keyData`, and collects only the values whose selection flag is
 * `true`. Keys that cannot be resolved or that have no selected values are omitted from the
 * result. The output is consumed by {@link generateCartesianProduct} to produce the final
 * set of CKV combinations.
 *
 * @param selectedKeyValues - Nested map of `keyId → valueId → isSelected` representing the current selection state.
 * @param keyData - Map from key name to its {@link GraphKey} data, used to resolve key and value metadata.
 * @returns An array of objects, each containing a key descriptor and the list
 *   of selected value descriptors for that key.
 */
export function groupSelectedValuesByKey(
  selectedKeyValues: Record<number, Record<number, boolean>>,
  keyData: Record<string, GraphKey>,
): Array<{
  key: Key;
  values: Array<{id: number; name: string}>;
}> {
  const selectedPerKey: Array<{
    key: Key;
    values: Array<{id: number; name: string}>;
  }> = [];

  Object.entries(selectedKeyValues).forEach(([keyIdStr, valueSelections]) => {
    const keyId = parseInt(keyIdStr, 10);

    const keyName = Object.keys(keyData).find(
      (name) => keyData[name].id === keyId,
    );
    if (!keyName) {
      return;
    }

    const key = keyData[keyName];
    const selectedValues: Array<{id: number; name: string}> = [];

    Object.entries(valueSelections).forEach(([valueIdStr, isSelected]) => {
      if (!isSelected) {
        return;
      }

      const valueId = parseInt(valueIdStr, 10);
      const value = key.values.find((v) => v.id === valueId);
      if (value) {
        selectedValues.push({id: value.id, name: value.name});
      }
    });

    if (selectedValues.length > 0) {
      selectedPerKey.push({
        key: {id: key.id, name: key.name, systemId: key.systemId},
        values: selectedValues,
      });
    }
  });

  return selectedPerKey;
}

/**
 * Re-resolves a narrow `{id, name}` key/value pair produced by the Cartesian-product
 * helpers above into the full {@link GraphKey}/{@link KeyValue} shape, by matching on
 * `id` against `keyData` — the helpers above intentionally stay widening-free, so this
 * is the one place that re-attaches `systemId` metadata.
 */
export function resolveGraphKeyAndValue(
  keyData: Record<string, GraphKey>,
  keyId: number,
  valueId: number,
): {key: GraphKey; value: KeyValue} | null {
  const key = Object.values(keyData).find(
    (candidate) => candidate.id === keyId,
  );
  if (!key) {
    return null;
  }
  const value = key.values.find((candidate) => candidate.id === valueId);
  if (!value) {
    return null;
  }
  return {key, value};
}

/**
 * Resolves every flagged entry in a `keyId → valueId → isSelected` selection
 * map into full {@link GraphKey}/{@link KeyValue} pairs — shared by the
 * memoized current-selection view and by callers that need the same
 * resolution for a not-yet-committed `next` state.
 */
export function resolveSelectedPairs(
  selectedKeyValues: Record<number, Record<number, boolean>>,
  keyData: Record<string, GraphKey>,
): Array<{key: GraphKey; value: KeyValue}> {
  return Object.entries(selectedKeyValues).flatMap(
    ([keyIdStr, valueSelections]) => {
      const keyId = parseInt(keyIdStr, 10);
      return Object.entries(valueSelections)
        .filter(([, isSelected]) => isSelected)
        .map(([valueIdStr]) =>
          resolveGraphKeyAndValue(keyData, keyId, parseInt(valueIdStr, 10)),
        )
        .filter(
          (pair): pair is {key: GraphKey; value: KeyValue} => pair !== null,
        );
    },
  );
}

export function buildCkvSystemId(
  keyValuePairs: Array<{key: GraphKey; value: KeyValue}>,
): string {
  return keyValuePairs
    .map((pair) => `${pair.key.systemId}:${pair.value.systemId}`)
    .sort()
    .join('|');
}
