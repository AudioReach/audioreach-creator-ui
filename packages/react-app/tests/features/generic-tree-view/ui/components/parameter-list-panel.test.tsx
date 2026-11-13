/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {TreeViewItem} from '~features/generic-tree-view/model/tree-view-data';
import {ParameterListPanel} from '~features/generic-tree-view/ui/components/parameter-list-panel';

jest.mock('~shared/lib/logger');
jest.unmock('@qualcomm-ui/react/tree');
jest.unmock('@qualcomm-ui/core/tree');
jest.unmock('@qualcomm-ui/react/checkbox');

// QUI dispatches PointerEvent when returning focus to a clicked tree row.
beforeAll(() => {
  window.PointerEvent = MouseEvent as typeof PointerEvent;
});

function makeItem(id: string): TreeViewItem {
  return {elements: [], id, name: id};
}

const ITEMS = [makeItem('param1'), makeItem('param2'), makeItem('param3')];

function SelectionPanel({
  initialSelection = [],
  matchSets = null,
  onSelectionChange = jest.fn(),
}: {
  initialSelection?: string[];
  matchSets?: {elementIds: Set<string>; paramIds: Set<string>} | null;
  onSelectionChange?: (ids: string[], expandNew?: boolean) => void;
}) {
  const [selectedIds, setSelectedIds] = useState(initialSelection);
  return (
    <ParameterListPanel
      dirtyItemIds={new Set()}
      items={ITEMS}
      matchSets={matchSets}
      moduleName="mod"
      onSelectionChange={(ids, expandNew) => {
        setSelectedIds(ids);
        onSelectionChange(ids, expandNew);
      }}
      selectedIds={selectedIds}
      setItemIds={new Set()}
      showPids={false}
    />
  );
}

const moduleCheckbox = () =>
  screen.getByRole('checkbox', {name: 'Select visible parameters in mod'});
const paramCheckbox = (name: string) =>
  screen.getByRole('checkbox', {name: `Select ${name}`});

describe('ParameterListPanel checkbox selection', () => {
  it('adds and removes parameters without clearing other selections', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    await act(async () => {
      render(<SelectionPanel onSelectionChange={onSelectionChange} />);
    });

    await user.click(paramCheckbox('param1'));
    await user.click(paramCheckbox('param2'));
    expect(paramCheckbox('param1')).toBeChecked();
    expect(paramCheckbox('param2')).toBeChecked();
    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      ['param1', 'param2'],
      undefined,
    );

    await user.click(paramCheckbox('param1'));
    expect(paramCheckbox('param1')).not.toBeChecked();
    expect(paramCheckbox('param2')).toBeChecked();
  });

  it('toggles a parameter by clicking its name or pressing Space on its row', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<SelectionPanel initialSelection={['param1']} />);
    });

    await user.click(screen.getByText('param2'));
    expect(paramCheckbox('param1')).toBeChecked();
    expect(paramCheckbox('param2')).toBeChecked();

    await act(async () => {
      screen
        .getByText('param2')
        .closest<HTMLElement>('[role="treeitem"]')!
        .focus();
    });
    await user.keyboard(' ');
    expect(paramCheckbox('param2')).not.toBeChecked();
    expect(paramCheckbox('param1')).toBeChecked();
  });

  it('shows none, some, and all selected and toggles all from the module checkbox', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    await act(async () => {
      render(<SelectionPanel onSelectionChange={onSelectionChange} />);
    });
    const all = moduleCheckbox();
    expect(all).not.toBeChecked();
    expect(all).not.toBePartiallyChecked();

    await user.click(paramCheckbox('param1'));
    expect(all).toBePartiallyChecked();
    await user.click(all);
    expect(all).toBeChecked();
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      ['param1', 'param2', 'param3'],
      false,
    );
    await user.click(all);
    expect(all).not.toBeChecked();
    expect(all).not.toBePartiallyChecked();
    expect(onSelectionChange).toHaveBeenLastCalledWith([], false);
  });

  it('selects and clears only filtered parameters while preserving hidden selections', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    await act(async () => {
      render(
        <SelectionPanel
          initialSelection={['param1']}
          matchSets={{elementIds: new Set(), paramIds: new Set(['param2'])}}
          onSelectionChange={onSelectionChange}
        />,
      );
    });
    const all = moduleCheckbox();
    expect(all).not.toBePartiallyChecked();
    expect(
      screen.queryByRole('checkbox', {name: 'Select param1'}),
    ).not.toBeInTheDocument();

    await user.click(all);
    expect(all).toBeChecked();
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      ['param1', 'param2'],
      false,
    );
    await user.click(all);
    expect(onSelectionChange).toHaveBeenLastCalledWith(['param1'], false);
  });

  it('supports Space on a focused checkbox without toggling twice', async () => {
    const user = userEvent.setup();
    const onSelectionChange = jest.fn();
    await act(async () => {
      render(<SelectionPanel onSelectionChange={onSelectionChange} />);
    });
    const checkbox = paramCheckbox('param1');
    await act(async () => {
      checkbox.focus();
    });
    await user.keyboard(' ');
    expect(checkbox).toBeChecked();
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it('disables select-all when there are no visible parameters', async () => {
    await act(async () => {
      render(
        <SelectionPanel
          initialSelection={['param1']}
          matchSets={{elementIds: new Set(), paramIds: new Set()}}
        />,
      );
    });
    const all = moduleCheckbox();
    expect(all).toBeDisabled();
    expect(all).not.toBeChecked();
    expect(all).not.toBePartiallyChecked();
  });
});
