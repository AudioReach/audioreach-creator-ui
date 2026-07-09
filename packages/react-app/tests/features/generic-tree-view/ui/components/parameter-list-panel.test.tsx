/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import type {TreeViewItem} from '~features/generic-tree-view/model/tree-view-data';
import {ParameterListPanel} from '~features/generic-tree-view/ui/components/parameter-list-panel';

jest.mock('~shared/lib/logger');

function makeItem(id: string): TreeViewItem {
  return {elements: [], id, name: id};
}

const ITEMS = [makeItem('param1'), makeItem('param2'), makeItem('param3')];

describe('ParameterListPanel select-all under an active filter', () => {
  it('plain click selects only the filtered items, not all visible items', () => {
    const onSelectionChange = jest.fn();
    render(
      <ParameterListPanel
        dirtyItemIds={new Set()}
        items={ITEMS}
        matchSets={{elementIds: new Set(), paramIds: new Set(['param2'])}}
        moduleName="mod"
        onSelectionChange={onSelectionChange}
        selectedIds={[]}
        setItemIds={new Set()}
        showPids={false}
      />,
    );

    fireEvent.click(screen.getByTestId('tree-label'));

    expect(onSelectionChange).toHaveBeenCalledWith(['param2'], false);
  });

  it('ctrl-click toggle-all is computed against the filtered set, not all visible items', () => {
    const onSelectionChange = jest.fn();
    render(
      <ParameterListPanel
        dirtyItemIds={new Set()}
        items={ITEMS}
        matchSets={{elementIds: new Set(), paramIds: new Set(['param2'])}}
        moduleName="mod"
        onSelectionChange={onSelectionChange}
        selectedIds={['param2']}
        setItemIds={new Set()}
        showPids={false}
      />,
    );

    fireEvent.click(screen.getByTestId('tree-label'), {ctrlKey: true});

    // param2 (the only filtered item) is already selected, so ctrl-click
    // should deselect it — not fall through to unfiltered param1/param3.
    expect(onSelectionChange).toHaveBeenCalledWith([], false);
  });
});
