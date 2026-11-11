/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {UsecaseCategory, UsecaseItem} from './usecase.types';

/**
 * Extracts systemIds from selected usecase names by matching them against
 * the category data.
 *
 * @param selectedNames - Array of usecase display names (item.name values)
 * @param usecaseData   - Category data containing UsecaseItem trees
 * @returns Array of systemIds corresponding to the selected usecases
 */
export function getSystemIdsFromFormattedUsecases(
  selectedNames: string[],
  usecaseData: UsecaseCategory[],
): string[] {
  if (!selectedNames?.length || !usecaseData?.length) {
    return [];
  }

  const allLeafItems = usecaseData.flatMap((cat) => getLeafItems(cat.items));
  const systemIds: string[] = [];

  for (const name of selectedNames) {
    const match = allLeafItems.find((item) => item.name === name);
    if (match?.systemId) {
      systemIds.push(match.systemId);
    }
  }

  return systemIds;
}

/** Returns only leaf items (items with no children) from a tree. */
export const getLeafItems = (items: UsecaseItem[]): UsecaseItem[] =>
  items.flatMap((item) =>
    (item.children?.length ?? 0) > 0 ? getLeafItems(item.children!) : [item],
  );

/** Makes an ID from the usecase key-values; it stays the same on every open. */
export const getUsecaseKeyValueKey = (item: UsecaseItem): string =>
  item.keyValuePairs
    .map((kv) => `${kv.key.naturalId}:${kv.value.naturalId}`)
    .join(',');
