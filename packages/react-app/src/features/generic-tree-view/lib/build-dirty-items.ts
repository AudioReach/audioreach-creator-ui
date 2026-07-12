/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TreeViewItem} from '../model/tree-view-data';

import {itemIdsFromPaths} from './item-ids-from-paths';
import {patchElements} from './patch-elements';

/**
 * Reconstructs dirty `TreeViewItem[]` from persisted edit-session state
 * (`elementValues`/`arrayCounts`/`dirtyPaths`) rather than a live
 * `GenericTreeView` instance — the same logic the feature runs internally
 * for `getEditedTreeViewItems`, exposed for callers that need it for an
 * unmounted view (e.g. a background tab's "Set & Close").
 */
export function buildDirtyItems(
  items: TreeViewItem[],
  dirtyPaths: Set<string>,
  elementValues: Map<string, string>,
  arrayCounts: Map<string, number>,
): TreeViewItem[] {
  if (dirtyPaths.size === 0) {
    return [];
  }
  const dirtyItemIds = itemIdsFromPaths(dirtyPaths);
  return items
    .filter((item) => dirtyItemIds.has(item.id))
    .map((item) => ({
      ...item,
      elements: patchElements(
        item.elements,
        item.id,
        [],
        elementValues,
        arrayCounts,
      ),
    }));
}
