/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {itemIdsFromPaths} from '~features/generic-tree-view/lib/item-ids-from-paths';

describe('itemIdsFromPaths', () => {
  it('returns an empty set for an empty input set', () => {
    expect(itemIdsFromPaths(new Set())).toEqual(new Set());
  });

  it('extracts the parameter id (first path segment) from a single path', () => {
    expect(itemIdsFromPaths(new Set(['param1/elementA']))).toEqual(
      new Set(['param1']),
    );
  });

  it('deduplicates multiple element paths under the same parameter id', () => {
    const paths = new Set([
      'param1/elementA',
      'param1/elementB',
      'param1/struct/field',
    ]);
    expect(itemIdsFromPaths(paths)).toEqual(new Set(['param1']));
  });

  it('returns one id per distinct parameter across multiple paths', () => {
    const paths = new Set(['param1/elementA', 'param2/elementB']);
    expect(itemIdsFromPaths(paths)).toEqual(new Set(['param1', 'param2']));
  });

  it('treats a bare parameter id path (no slash) as its own id', () => {
    expect(itemIdsFromPaths(new Set(['param1']))).toEqual(new Set(['param1']));
  });

  it('skips keys with an empty-string first segment', () => {
    expect(itemIdsFromPaths(new Set(['/elementA']))).toEqual(new Set());
  });
});
