/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {findSubsystemAncestorNodeIds} from '~features/subsystem-browser/lib/subsystem-tree-selection';
import type {SubsystemBrowserTreeNode} from '~shared/store/tab-store-slices/subsystem-slice';

const tree: SubsystemBrowserTreeNode[] = [
  {
    children: [
      {
        children: [
          {
            children: [],
            id: 2,
            name: 'Child',
            subgraphIds: [],
            systemId: 'child',
          },
        ],
        id: 1,
        name: 'Root',
        subgraphIds: [],
        systemId: 'root',
      },
    ],
    id: 0,
    name: 'TOP',
    subgraphIds: [],
    systemId: '__top__',
  },
];

describe('findSubsystemAncestorNodeIds', () => {
  it('returns node IDs from TOP to a nested subsystem', () => {
    expect(findSubsystemAncestorNodeIds(tree, 'child')).toEqual([0, 1, 2]);
  });

  it('returns no IDs when the subsystem is absent', () => {
    expect(findSubsystemAncestorNodeIds(tree, 'missing')).toEqual([]);
  });
});
