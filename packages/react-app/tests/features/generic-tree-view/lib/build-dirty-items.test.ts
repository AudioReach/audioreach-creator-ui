/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ConfigElementDto} from '~entities/spf-module-data';
import {buildDirtyItems} from '~features/generic-tree-view/lib/build-dirty-items';
import type {TreeViewItem} from '~features/generic-tree-view/model/tree-view-data';

jest.mock('~shared/lib/logger');

function makeItem(id: string, value: string): TreeViewItem {
  return {
    elements: [
      {isReadOnly: false, name: 'gain', type: 'CONFIG_ELEMENT', value},
    ],
    id,
    name: `Param ${id}`,
  };
}

describe('buildDirtyItems', () => {
  it('returns an empty array when dirtyPaths is empty', () => {
    const items = [makeItem('param-1', '0x00000010')];

    expect(buildDirtyItems(items, new Set(), new Map(), new Map())).toEqual([]);
  });

  it('returns only items with a dirty path prefixed by the item id', () => {
    const items = [
      makeItem('param-1', '0x00000010'),
      makeItem('param-2', '0x00000020'),
    ];
    const dirtyPaths = new Set(['param-1/gain']);

    const result = buildDirtyItems(items, dirtyPaths, new Map(), new Map());

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('param-1');
  });

  it('patches the dirty item elements from elementValues', () => {
    const items = [makeItem('param-1', '0x00000010')];
    const dirtyPaths = new Set(['param-1/gain']);
    const elementValues = new Map([['param-1/gain', '0x00000099']]);

    const [result] = buildDirtyItems(
      items,
      dirtyPaths,
      elementValues,
      new Map(),
    );

    expect((result.elements[0] as ConfigElementDto).value).toBe('0x00000099');
  });
});
