/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';

import SubsystemTreeView from '~features/subsystem-browser/ui/subsystem-tree-view';
import type {SubsystemBrowserTreeNode} from '~shared/store/tab-store-slices/subsystem-slice';

const treeData: SubsystemBrowserTreeNode[] = [
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
        name: 'Parent',
        subgraphIds: [],
        systemId: 'parent',
      },
    ],
    id: 0,
    name: 'TOP',
    subgraphIds: [],
    systemId: '__top__',
  },
];

describe('SubsystemTreeView', () => {
  it('reveals and selects the active nested subsystem', async () => {
    render(
      <SubsystemTreeView
        data={treeData}
        onClick={jest.fn()}
        selectedSystemId="child"
      />,
    );

    expect(
      await screen.findByRole('button', {name: 'Navigate to Child'}),
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Parent')).toBeVisible();
  });
});
