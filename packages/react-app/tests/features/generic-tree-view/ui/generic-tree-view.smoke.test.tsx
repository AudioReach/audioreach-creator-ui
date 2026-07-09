/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createRef} from 'react';

import {act, render} from '@testing-library/react';

import {
  GenericTreeView,
  type GenericTreeViewHandle,
  type TreeViewData,
  type TreeViewItem,
} from '~features/generic-tree-view';

jest.mock('~shared/lib/logger');

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

// ── Minimal fixtures ────────────────────────────────────────────────────────

function makeItem(id: string): TreeViewItem {
  return {
    elements: [
      {
        isReadOnly: false,
        name: 'gain',
        type: 'CONFIG_ELEMENT',
        value: '0x00000010',
      },
    ],
    id,
    name: `Parameter ${id}`,
  };
}

function makeData(items: TreeViewItem[] = []): TreeViewData {
  return {
    items: items.length > 0 ? items : [makeItem('100')],
    systemId: 'sys-1',
  };
}

// ── Smoke tests ─────────────────────────────────────────────────────────────

describe('GenericTreeView (smoke)', () => {
  it('renders without crashing with minimal TreeViewData', () => {
    const ref = createRef<GenericTreeViewHandle>();
    expect(() => {
      render(
        <GenericTreeView ref={ref} data={makeData()} title="Test Module" />,
      );
    }).not.toThrow();
  });

  it('getEditedTreeViewItems returns null when no edits have been made', () => {
    const ref = createRef<GenericTreeViewHandle>();
    render(<GenericTreeView ref={ref} data={makeData()} title="Test Module" />);
    expect(ref.current).not.toBeNull();
    expect(ref.current!.getEditedTreeViewItems()).toBeNull();
  });

  it('getTreeViewData returns the current data', () => {
    const ref = createRef<GenericTreeViewHandle>();
    const data = makeData([makeItem('200'), makeItem('201')]);
    render(<GenericTreeView ref={ref} data={data} title="Test Module" />);
    expect(ref.current!.getTreeViewData()).toBe(data);
  });

  it('reset does not throw', () => {
    const ref = createRef<GenericTreeViewHandle>();
    render(<GenericTreeView ref={ref} data={makeData()} title="Test Module" />);
    expect(() =>
      act(() => {
        ref.current!.reset();
      }),
    ).not.toThrow();
  });

  it('renders with empty items array without crashing', () => {
    const ref = createRef<GenericTreeViewHandle>();
    expect(() => {
      render(
        <GenericTreeView
          ref={ref}
          data={{items: [], systemId: 'empty'}}
          title="Empty"
        />,
      );
    }).not.toThrow();
  });

  it('getEditedTreeViewItems returns null after reset', () => {
    const ref = createRef<GenericTreeViewHandle>();
    render(<GenericTreeView ref={ref} data={makeData()} title="Test Module" />);
    act(() => {
      ref.current!.reset();
    });
    expect(ref.current!.getEditedTreeViewItems()).toBeNull();
  });
});
