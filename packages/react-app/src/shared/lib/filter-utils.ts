/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Filters `items` to those whose type is in `selectedTypes`, then narrows
 * further to those where at least one text field matches `query`.
 *
 * @param getType - Extracts the type discriminant from an item.
 * @param getTexts - Extracts the searchable text fields from an item.
 *   Each field is checked independently so a query cannot span field
 *   boundaries (preserves the original `field.includes(q) || …` semantics).
 */
export function filterByTypeAndQuery<T>(
  items: T[],
  selectedTypes: string[],
  getType: (item: T) => string,
  query: string,
  getTexts: (item: T) => (string | undefined)[],
): T[] {
  let filtered = items;

  if (selectedTypes.length > 0) {
    const typeSet = new Set(selectedTypes);
    filtered = filtered.filter((item) => typeSet.has(getType(item)));
  } else {
    filtered = [];
  }

  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter((item) =>
      getTexts(item).some((text) => text?.toLowerCase().includes(q)),
    );
  }

  return filtered;
}
