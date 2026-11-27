/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TreeViewItem} from '~features/generic-tree-view';
import {
  dirtyItemsToVcpmUpdateRequests,
  vcpmCalDataToTreeViewData,
} from '~widgets/vcpm-data-tab/lib/vcpm-tree-adapter';

describe('vcpmCalDataToTreeViewData', () => {
  it('maps parameters to tree view items keyed by systemId', () => {
    const data = vcpmCalDataToTreeViewData(
      [{elements: [], name: 'Volume', systemId: 'p-1'}],
      'ckv-1',
    );

    expect(data).toEqual({
      items: [{elements: [], id: 'p-1', name: 'Volume'}],
      systemId: 'ckv-1',
    });
  });

  it('maps an empty parameter list to an empty items array', () => {
    const data = vcpmCalDataToTreeViewData([], 'ckv-1');

    expect(data).toEqual({items: [], systemId: 'ckv-1'});
  });
});

describe('dirtyItemsToVcpmUpdateRequests', () => {
  it('maps each dirty item to its own singular update request', () => {
    const dirtyItems: TreeViewItem[] = [
      {elements: [{type: 'ConfigElement'}] as never, id: 'p-1', name: 'Volume'},
    ];

    const requests = dirtyItemsToVcpmUpdateRequests(dirtyItems);

    expect(requests).toEqual([
      {elements: [{type: 'ConfigElement'}], name: 'Volume', systemId: 'p-1'},
    ]);
  });

  it('maps multiple dirty items to one request each, not a batch', () => {
    const dirtyItems: TreeViewItem[] = [
      {elements: [], id: 'p-1', name: 'Volume'},
      {elements: [], id: 'p-2', name: 'Gain'},
    ];

    const requests = dirtyItemsToVcpmUpdateRequests(dirtyItems);

    expect(requests).toEqual([
      {elements: [], name: 'Volume', systemId: 'p-1'},
      {elements: [], name: 'Gain', systemId: 'p-2'},
    ]);
  });
});
