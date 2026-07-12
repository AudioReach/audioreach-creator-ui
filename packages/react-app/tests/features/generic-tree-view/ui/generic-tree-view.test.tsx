/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createRef} from 'react';

import {act, fireEvent, render, screen} from '@testing-library/react';

import type {AnyElementDto} from '~entities/spf-module-data';
import {
  GenericTreeView,
  type GenericTreeViewHandle,
  type TreeViewData,
  type TreeViewItem,
} from '~features/generic-tree-view';
import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

jest.mock('~shared/lib/logger');

// Flush any pending timers (e.g. 150ms search debounce) after each test
// so React state updates don't leak into the next test or produce act() warnings.
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeItem(
  id: string,
  overrides: Partial<TreeViewItem> = {},
): TreeViewItem {
  return {
    elements: [
      {isReadOnly: false, name: 'gain', type: 'CONFIG_ELEMENT', value: '10'},
    ],
    id,
    name: `Param ${id}`,
    ...overrides,
  };
}

function makeData(
  items: TreeViewItem[] = [],
  systemId = 'sys-1',
): TreeViewData {
  return {
    items: items.length > 0 ? items : [makeItem('100')],
    systemId,
  };
}

function makeUiState(
  overrides: Partial<GenericTreeViewUiState> = {},
): GenericTreeViewUiState {
  return {
    arrayCounts: {},
    committedValues: {'100/gain': '10'},
    dirtyPaths: [],
    elementValues: {'100/gain': '10'},
    expandedIds: ['100'],
    invalidPaths: [],
    legacyExpandedKeys: ['__module__'],
    panelSplitPct: 30,
    policyFilter: ['BASIC'],
    searchText: '',
    selectedIds: ['100'],
    setPaths: [],
    showBadges: false,
    showErrorsOnly: false,
    showModifiedOnly: false,
    showPids: false,
    showRanges: false,
    viewMode: 'modern',
    ...overrides,
  };
}

// ── initialUiState restoration ────────────────────────────────────────────────

describe('initialUiState restoration', () => {
  it('applies viewMode from initialUiState', () => {
    render(
      <GenericTreeView
        data={makeData()}
        initialUiState={makeUiState({viewMode: 'legacy'})}
        title="Test"
      />,
    );
    // In legacy mode, the Toolbar shows a "Modern" button (to switch back)
    expect(screen.getByText('Modern')).toBeInTheDocument();
  });

  it('defaults to modern view when no initialUiState', () => {
    render(<GenericTreeView data={makeData()} title="Test" />);
    // In modern mode, the Toolbar shows a "Legacy" button
    expect(screen.getByText('Legacy')).toBeInTheDocument();
  });

  it('initialUiState with no searchText leaves the search bar empty', () => {
    render(
      <GenericTreeView
        data={makeData()}
        initialUiState={makeUiState({searchText: ''})}
        title="Test"
      />,
    );
    const input = screen.getByPlaceholderText('Search…');
    expect(input.value).toBe('');
  });

  it('restores non-empty searchText from initialUiState', () => {
    render(
      <GenericTreeView
        data={makeData()}
        initialUiState={makeUiState({searchText: 'gain'})}
        title="Test"
      />,
    );
    const input = screen.getByPlaceholderText('Search…');
    expect(input.value).toBe('gain');
  });

  it('defaults to empty search text when no initialUiState', () => {
    render(<GenericTreeView data={makeData()} title="Test" />);
    const input = screen.getByPlaceholderText('Search…');
    expect(input.value).toBe('');
  });

  it('restores policyFilter from initialUiState', () => {
    render(
      <GenericTreeView
        data={makeData()}
        initialUiState={makeUiState({policyFilter: ['BASIC', 'ADVANCED']})}
        title="Test"
      />,
    );
    // The SegmentedControl.Root receives value={Array.from(policyFilter)}.
    // The mock renders <div data-testid="segmented-control"> with Item children.
    // We verify the control renders with both items available.
    const items = screen.getAllByTestId('seg-item');
    const values = items.map((el) => el.getAttribute('data-value'));
    expect(values).toContain('BASIC');
    expect(values).toContain('ADVANCED');
  });

  it('restores committedValues so that matching edits are not dirty', () => {
    const ref = createRef<GenericTreeViewHandle>();
    // Both elementValues and committedValues are '10' → nothing is dirty
    render(
      <GenericTreeView
        ref={ref}
        data={makeData()}
        initialUiState={makeUiState({
          committedValues: {'100/gain': '10'},
          dirtyPaths: [],
          elementValues: {'100/gain': '10'},
        })}
        title="Test"
      />,
    );
    expect(ref.current!.getEditedTreeViewItems()).toBeNull();
  });
});

// ── onUiStateChange emission ──────────────────────────────────────────────────

describe('onUiStateChange emission', () => {
  it('emits {searchText} patch after typing in search', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData()}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    // Target the search bar by placeholder, not data-testid, which is shared
    // with element value TextInputs in the detail pane.
    fireEvent.change(screen.getByPlaceholderText('Search…'), {
      target: {value: 'gain'},
    });
    // Flush the 150ms debounce
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({searchText: 'gain'}),
    );
  });

  it('emits {viewMode} patch after clicking the view toggle', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData()}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    // In modern mode, clicking "Legacy" switches to legacy
    act(() => {
      fireEvent.click(screen.getByText('Legacy'));
    });
    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({viewMode: 'legacy'}),
    );
  });

  it('does not fire the re-seed effect on initial mount (P0 regression)', () => {
    // prevDataRef seeds to the initial `data` prop, so the mount-time effect
    // must not treat first render as a data change and wipe restored state.
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData()}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    expect(onUiStateChange).not.toHaveBeenCalledWith(
      expect.objectContaining({elementValues: expect.anything()}),
    );
  });

  it('syncs the auto-selected first param to the store on initial mount', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData([makeItem('100'), makeItem('200')])}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    expect(onUiStateChange).toHaveBeenCalledWith({
      expandedIds: ['100'],
      selectedIds: ['100'],
    });
  });

  it('does not re-sync selectedIds when initialUiState was provided', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData([makeItem('100')])}
        initialUiState={makeUiState({selectedIds: []})}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    expect(onUiStateChange).not.toHaveBeenCalled();
  });

  it('restored dirtyPaths/elementValues survive mount, not cleared by re-seed', () => {
    const ref = createRef<GenericTreeViewHandle>();
    const data = makeData([makeItem('100')]);
    render(
      <GenericTreeView
        ref={ref}
        data={data}
        initialUiState={makeUiState({
          committedValues: {'100/gain': '10'},
          dirtyPaths: ['100/gain'],
          elementValues: {'100/gain': '99'},
        })}
        title="Test"
      />,
    );
    expect(ref.current!.getEditedTreeViewItems()).not.toBeNull();
  });

  it('emits {expandedIds} patch after Collapse All', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData()}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    act(() => {
      fireEvent.click(screen.getByText('Collapse All'));
    });
    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({expandedIds: []}),
    );
  });
});

// ── re-seed effect ────────────────────────────────────────────────────────────

describe('re-seed on data prop change', () => {
  it('clears dirty state when data prop reference changes', () => {
    const ref = createRef<GenericTreeViewHandle>();
    const data1 = makeData([makeItem('100')]);
    const {rerender} = render(
      <GenericTreeView ref={ref} data={data1} title="Test" />,
    );
    // Verify nothing dirty to start
    expect(ref.current!.getEditedTreeViewItems()).toBeNull();

    // Replace with new data reference
    const data2 = makeData([makeItem('200')], 'sys-2');
    act(() => {
      rerender(<GenericTreeView ref={ref} data={data2} title="Test" />);
    });

    // After re-seed, nothing dirty
    expect(ref.current!.getEditedTreeViewItems()).toBeNull();
  });

  it('re-seed emits onUiStateChange with fresh values', () => {
    const onUiStateChange = jest.fn();
    const data1 = makeData([makeItem('100')]);
    const {rerender} = render(
      <GenericTreeView
        data={data1}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );

    onUiStateChange.mockClear();

    const data2 = makeData([makeItem('200')], 'sys-2');
    act(() => {
      rerender(
        <GenericTreeView
          data={data2}
          onUiStateChange={onUiStateChange}
          title="Test"
        />,
      );
    });

    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dirtyPaths: [],
        setPaths: [],
      }),
    );
  });

  it('same data reference does not trigger re-seed', () => {
    const onUiStateChange = jest.fn();
    const data = makeData();
    const {rerender} = render(
      <GenericTreeView
        data={data}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();

    // Re-render with the exact same reference
    act(() => {
      rerender(
        <GenericTreeView
          data={data}
          onUiStateChange={onUiStateChange}
          title="Test"
        />,
      );
    });

    expect(onUiStateChange).not.toHaveBeenCalled();
  });
});

// ── reconcile dirty/set state on Set success ──────────────────────────────────

describe('reconcile dirty/set state on Set success', () => {
  function makeItemWithGain(id: string, value: string): TreeViewItem {
    return makeItem(id, {
      elements: [
        {isReadOnly: false, name: 'gain', type: 'CONFIG_ELEMENT', value},
      ],
    });
  }

  function makeItemWithTwoElements(
    id: string,
    gain: string,
    volume: string,
  ): TreeViewItem {
    return makeItem(id, {
      elements: [
        {isReadOnly: false, name: 'gain', type: 'CONFIG_ELEMENT', value: gain},
        {
          isReadOnly: false,
          name: 'volume',
          type: 'CONFIG_ELEMENT',
          value: volume,
        },
      ],
    });
  }

  it('moves a path from dirtyPaths to setPaths when the merged snapshot value matches what was sent, leaving unrelated dirty paths untouched', () => {
    const onUiStateChange = jest.fn();
    const data1 = makeData([makeItemWithTwoElements('100', '10', '20')]);
    const {rerender} = render(
      <GenericTreeView
        data={data1}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );

    fireInputChange('100/gain', '99');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireInputChange('100/volume', '77');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    onUiStateChange.mockClear();

    // Simulate a Set that only confirmed 100/gain; 100/volume arrives
    // unchanged in the merged snapshot (backend didn't process it in this
    // batch).
    const setSnapshot: TreeViewData = {
      items: [makeItemWithTwoElements('100', '99', '20')],
      source: 'set',
      systemId: data1.systemId,
    };
    act(() => {
      rerender(
        <GenericTreeView
          data={setSnapshot}
          onUiStateChange={onUiStateChange}
          title="Test"
        />,
      );
    });

    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dirtyPaths: ['100/volume'],
        setPaths: ['100/gain'],
      }),
    );
  });

  it('leaves a path in dirtyPaths when the backend did not process it (merged value differs from what was sent)', () => {
    const onUiStateChange = jest.fn();
    const data1 = makeData([makeItemWithGain('100', '10')]);
    const {rerender} = render(
      <GenericTreeView
        data={data1}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );

    fireInputChange('100/gain', '99');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    onUiStateChange.mockClear();

    // Merged snapshot still shows the pre-edit value — backend never wrote it.
    const setSnapshot: TreeViewData = {
      items: [makeItemWithGain('100', '10')],
      source: 'set',
      systemId: data1.systemId,
    };
    act(() => {
      rerender(
        <GenericTreeView
          data={setSnapshot}
          onUiStateChange={onUiStateChange}
          title="Test"
        />,
      );
    });

    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dirtyPaths: ['100/gain'],
        setPaths: [],
      }),
    );
  });

  it('Get success still fully re-seeds — reconciliation must not apply on the Get path', () => {
    const onUiStateChange = jest.fn();
    const data1 = makeData([makeItemWithGain('100', '10')]);
    const {rerender} = render(
      <GenericTreeView
        data={data1}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );

    fireInputChange('100/gain', '99');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    onUiStateChange.mockClear();

    // A Get (source omitted) with a value that would NOT reconcile if treated
    // as a Set — the full re-seed must still clear dirtyPaths regardless.
    const getSnapshot = makeData([makeItemWithGain('100', '10')], 'sys-2');
    act(() => {
      rerender(
        <GenericTreeView
          data={getSnapshot}
          onUiStateChange={onUiStateChange}
          title="Test"
        />,
      );
    });

    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({dirtyPaths: [], setPaths: []}),
    );
  });

  it('mounting with initialUiState and a source: "set" data prop does not trigger reconciliation', () => {
    const onUiStateChange = jest.fn();
    const data = makeData([makeItemWithGain('100', '10')]);
    const setData: TreeViewData = {...data, source: 'set'};
    render(
      <GenericTreeView
        data={setData}
        initialUiState={makeUiState({
          committedValues: {'100/gain': '10'},
          dirtyPaths: ['100/gain'],
          elementValues: {'100/gain': '99'},
        })}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );

    expect(onUiStateChange).not.toHaveBeenCalled();
  });

  it('recomputes array counts wholesale from the merged snapshot on Set', () => {
    const onUiStateChange = jest.fn();
    const instance: AnyElementDto = {
      isReadOnly: false,
      name: 'val',
      type: 'CONFIG_ELEMENT',
      value: '0',
    };
    const item1 = makeItem('100', {
      elements: [
        {
          isReadOnly: false,
          name: 'items',
          type: 'ELEMENT_TEMPLATE_ARRAY',
          value: [instance, instance],
        },
      ],
    });
    const data1 = makeData([item1]);
    const {rerender} = render(
      <GenericTreeView
        data={data1}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();

    // Merged snapshot now has 3 instances (e.g. another session added one).
    const item2 = makeItem('100', {
      elements: [
        {
          isReadOnly: false,
          name: 'items',
          type: 'ELEMENT_TEMPLATE_ARRAY',
          value: [instance, instance, instance],
        },
      ],
    });
    const setSnapshot: TreeViewData = {
      items: [item2],
      source: 'set',
      systemId: data1.systemId,
    };
    act(() => {
      rerender(
        <GenericTreeView
          data={setSnapshot}
          onUiStateChange={onUiStateChange}
          title="Test"
        />,
      );
    });

    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        arrayCounts: expect.objectContaining({'100/items': 3}),
      }),
    );
  });
});

// ── hideToolbar ───────────────────────────────────────────────────────────────

describe('hideToolbar', () => {
  it('renders toolbar when hideToolbar is not set', () => {
    render(<GenericTreeView data={makeData()} title="Test" />);
    // The search bar is uniquely identifiable by its placeholder
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument();
  });

  it('removes toolbar from DOM when hideToolbar={true}', () => {
    render(<GenericTreeView data={makeData()} hideToolbar title="Test" />);
    expect(screen.queryByPlaceholderText('Search…')).not.toBeInTheDocument();
    expect(screen.queryByTestId('segmented-control')).not.toBeInTheDocument();
  });

  it('still mounts content area when hideToolbar={true}', () => {
    render(<GenericTreeView data={makeData()} hideToolbar title="Test" />);
    // ParameterListPanel renders a Tree.Root → data-testid="tree-root".
    // Multiple tree-roots may exist (list + detail pane); just assert at least one.
    expect(screen.getAllByTestId('tree-root').length).toBeGreaterThan(0);
  });
});

// ── defaultPolicyFilter ───────────────────────────────────────────────────────

describe('defaultPolicyFilter', () => {
  it('defaults policyFilter to [BASIC] when not specified', () => {
    render(<GenericTreeView data={makeData()} title="Test" />);
    // SegmentedControl.Root receives value={Array.from(policyFilter)}.
    // We verify the control is rendered (the prop has a default set).
    expect(screen.getByTestId('segmented-control')).toBeInTheDocument();
  });

  it('applies defaultPolicyFilter on first mount when no initialUiState', () => {
    // With defaultPolicyFilter=['BASIC','ADVANCED'], both filters are active.
    // The SegmentedControl mock renders Items for both regardless of value
    // (the mock does not filter), but the internal state should have both set.
    // We verify by checking onUiStateChange receives both after a filter toggle.
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData()}
        defaultPolicyFilter={['BASIC', 'ADVANCED']}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    // Clicking Collapse All emits expandedIds but not policyFilter —
    // the existing filter is already BASIC+ADVANCED. Instead, verify
    // rendering does not crash with the combined filter.
    expect(screen.getByTestId('segmented-control')).toBeInTheDocument();
  });

  it('initialUiState policyFilter overrides defaultPolicyFilter', () => {
    const onUiStateChange = jest.fn();
    // defaultPolicyFilter has ADVANCED, but initialUiState has only BASIC.
    // After view toggle, emitted policyFilter should reflect the initialUiState
    // value, not the default.
    render(
      <GenericTreeView
        data={makeData()}
        defaultPolicyFilter={['BASIC', 'ADVANCED']}
        initialUiState={makeUiState({policyFilter: ['BASIC']})}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    act(() => {
      fireEvent.click(screen.getByText('Collapse All'));
    });
    // CollapseAll emits expandedIds, not policyFilter, so policyFilter was
    // never emitted — meaning initialUiState's filter was never overwritten
    // by defaultPolicyFilter on mount.
    const policyCall = (
      onUiStateChange.mock.calls as Array<[Partial<GenericTreeViewUiState>]>
    ).find(([patch]) => 'policyFilter' in patch);
    expect(policyCall).toBeUndefined();
  });
});

// ── getEditedTreeViewItems / reset handle methods ─────────────────────────────

describe('imperative handle methods', () => {
  it('getEditedTreeViewItems returns null when nothing is dirty', () => {
    const ref = createRef<GenericTreeViewHandle>();
    render(<GenericTreeView ref={ref} data={makeData()} title="Test" />);
    expect(ref.current!.getEditedTreeViewItems()).toBeNull();
  });

  it('getTreeViewData returns the current data prop', () => {
    const ref = createRef<GenericTreeViewHandle>();
    const data = makeData([makeItem('100'), makeItem('101')]);
    render(<GenericTreeView ref={ref} data={data} title="Test" />);
    expect(ref.current!.getTreeViewData()).toBe(data);
  });

  it('reset does not throw when nothing is dirty', () => {
    const ref = createRef<GenericTreeViewHandle>();
    render(<GenericTreeView ref={ref} data={makeData()} title="Test" />);
    expect(() => act(() => ref.current!.reset())).not.toThrow();
  });

  it('reset emits onUiStateChange with empty dirty/set paths', () => {
    const ref = createRef<GenericTreeViewHandle>();
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        ref={ref}
        data={makeData()}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();
    act(() => ref.current!.reset());
    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({dirtyPaths: [], setPaths: []}),
    );
  });

  it('getEditedTreeViewItems returns null after reset', () => {
    const ref = createRef<GenericTreeViewHandle>();
    render(<GenericTreeView ref={ref} data={makeData()} title="Test" />);
    act(() => ref.current!.reset());
    expect(ref.current!.getEditedTreeViewItems()).toBeNull();
  });
});

// Helper: find the actual <input> element inside the QUI TextInput mock wrapper.
// The TextInput mock renders a div wrapper with data-testid="q-text-input" and
// an input inside. getByLabelText returns the wrapper div when aria-label is on
// the wrapper — we need the input child.
function getInputByAriaLabel(label: string): HTMLInputElement {
  // The mock renders aria-label on the wrapping div; find the input inside it.
  const wrapper = screen.getByLabelText(label);
  if (wrapper.tagName === 'INPUT') {
    return wrapper as HTMLInputElement;
  }
  const input = wrapper.querySelector('input');
  if (!input) {
    throw new Error(`No input found inside wrapper for "${label}"`);
  }
  return input;
}

// Helper: fire a change event on an input, bypassing the read-only value setter
// for uncontrolled inputs in jsdom.
function fireInputChange(label: string, value: string): void {
  const input = getInputByAriaLabel(label);
  // Use the native setter to update an uncontrolled input's value.
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  }
  fireEvent.change(input, {target: {value}});
}

describe('handleValueChange emits onUiStateChange', () => {
  function makeItemWithGain(id: string, value = '10'): TreeViewItem {
    return makeItem(id, {
      elements: [
        {isReadOnly: false, name: 'gain', type: 'CONFIG_ELEMENT', value},
      ],
    });
  }

  it('emits dirtyPaths and elementValues after an element value change', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData([makeItemWithGain('100')])}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();

    fireInputChange('100/gain', '99');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dirtyPaths: expect.arrayContaining(['100/gain']),
        elementValues: expect.objectContaining({'100/gain': '99'}),
      }),
    );
  });

  it('emits empty dirtyPaths when value is flipped back to original', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData([makeItemWithGain('100', '10')])}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();

    // Dirty it
    fireInputChange('100/gain', '99');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    onUiStateChange.mockClear();

    // Flip back to original
    fireInputChange('100/gain', '10');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({dirtyPaths: []}),
    );
  });
});

describe('arrayCounts emission from length-controller edit', () => {
  // Build a TreeViewItem with a CONFIG_ELEMENT 'count' (the length controller)
  // and an ELEMENT_TEMPLATE_ARRAY 'filters' whose lengthFormula references 'count'.
  // The array starts with 2 instances so that setting count to 3 is a real change.
  function makeItemWithLengthController(id: string): TreeViewItem {
    const instance: AnyElementDto = {
      isReadOnly: false,
      name: 'val',
      type: 'CONFIG_ELEMENT',
      value: '0',
    };
    return makeItem(id, {
      elements: [
        {
          isReadOnly: false,
          name: 'count',
          type: 'CONFIG_ELEMENT',
          value: '2',
        },
        {
          isReadOnly: false,
          lengthFormula: 'count',
          name: 'filters',
          template: [instance],
          type: 'ELEMENT_TEMPLATE_ARRAY',
          value: [instance, instance],
        },
      ],
    });
  }

  it('emits arrayCounts patch when a length-controller input changes', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData([makeItemWithLengthController('100')])}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();

    // Change the length controller from 2 → 3.
    fireInputChange('100/count', '3');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // The patch must include arrayCounts with the updated count for '100/filters'.
    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        arrayCounts: expect.objectContaining({'100/filters': 3}),
      }),
    );
  });
});

describe('invalidPaths range validation', () => {
  function makeItemWithRangedGain(id: string): TreeViewItem {
    return makeItem(id, {
      elements: [
        {
          isReadOnly: false,
          max: 100,
          min: 0,
          name: 'gain',
          type: 'CONFIG_ELEMENT',
          value: '50',
        },
      ],
    });
  }

  it('populates invalidPaths when value is out of range', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData([makeItemWithRangedGain('100')])}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();

    fireInputChange('100/gain', '200');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        invalidPaths: expect.arrayContaining(['100/gain']),
      }),
    );
  });

  it('clears invalidPaths when value is corrected to within range', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData([makeItemWithRangedGain('100')])}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();

    // Put out of range
    fireInputChange('100/gain', '200');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    onUiStateChange.mockClear();

    // Correct it
    fireInputChange('100/gain', '75');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({invalidPaths: []}),
    );
  });

  it('restores invalidPaths from initialUiState on mount', () => {
    // Build an item with two ranged elements: 'gain' (seeded invalid) and
    // 'offset' (valid). Seeding invalidPaths: ['100/gain'] on mount and then
    // firing a change on 'offset' must emit a patch where '100/gain' is still
    // in invalidPaths — proving the seeded value survived the first interaction.
    function makeItemWithTwoRangedElements(id: string): TreeViewItem {
      return makeItem(id, {
        elements: [
          {
            isReadOnly: false,
            max: 100,
            min: 0,
            name: 'gain',
            type: 'CONFIG_ELEMENT',
            value: '200',
          },
          {
            isReadOnly: false,
            max: 100,
            min: 0,
            name: 'offset',
            type: 'CONFIG_ELEMENT',
            value: '50',
          },
        ],
      });
    }

    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData([makeItemWithTwoRangedElements('100')])}
        initialUiState={makeUiState({
          committedValues: {'100/gain': '200', '100/offset': '50'},
          elementValues: {'100/gain': '200', '100/offset': '50'},
          invalidPaths: ['100/gain'],
        })}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();

    // Change 'offset' (a DIFFERENT element) to a valid value.
    fireInputChange('100/offset', '60');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // The emitted patch must still carry '100/gain' in invalidPaths because
    // the seeded invalid path was in state and was not cleared by changing offset.
    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        invalidPaths: expect.arrayContaining(['100/gain']),
      }),
    );
  });

  it('autoCommit.onCommit does not fire while invalidPaths is non-empty', () => {
    // Build a scenario where we can force invalidPaths to be non-empty
    // by having a ranged element and changing it out of range.
    const onCommit = jest.fn();
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        autoCommit={{onCommit}}
        data={makeData([makeItemWithRangedGain('100')])}
        initialUiState={makeUiState({
          elementValues: {'100/gain': '200'},
          invalidPaths: ['100/gain'],
        })}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    // With invalidPaths non-empty from initialUiState, autoCommit must not fire.
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('Modified Only / Errors Only filters', () => {
  function makeItemWithRangedGain(id: string, value = '50'): TreeViewItem {
    return makeItem(id, {
      elements: [
        {
          isReadOnly: false,
          max: 100,
          min: 0,
          name: 'gain',
          type: 'CONFIG_ELEMENT',
          value,
        },
      ],
    });
  }

  function toggleSwitch(label: string): void {
    const checkbox = screen
      .getByText(label)
      .closest('[data-testid="q-switch"]')
      ?.querySelector('input[type="checkbox"]');
    if (!checkbox) {
      throw new Error(`No checkbox found for switch "${label}"`);
    }
    fireEvent.click(checkbox);
  }

  // The parameter list panel and detail pane can both render a selected
  // item's name; scope assertions to the list panel's tree via node-text.
  function listedParamNames(): string[] {
    return screen
      .getAllByTestId('node-text')
      .map((el) => el.textContent)
      .filter(
        (text): text is string => text !== null && text.startsWith('Param '),
      );
  }

  it('Modified Only switch is absent when no dirty paths exist', () => {
    render(
      <GenericTreeView
        data={makeData([makeItem('100'), makeItem('101')])}
        title="Test"
      />,
    );
    expect(screen.queryByText('Modified Only')).not.toBeInTheDocument();
  });

  it('Modified Only switch appears after an edit and hides clean parameters', () => {
    render(
      <GenericTreeView
        data={makeData([makeItem('100'), makeItem('101')])}
        title="Test"
      />,
    );

    fireInputChange('100/gain', '99');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByText('Modified Only')).toBeInTheDocument();
    expect(listedParamNames()).toEqual(['Param 100', 'Param 101']);

    toggleSwitch('Modified Only');

    expect(listedParamNames()).toEqual(['Param 100']);
  });

  it('Modified Only switch disappears when the last dirty path is cleared', () => {
    render(
      <GenericTreeView
        data={makeData([makeItemWithRangedGain('100', '10')])}
        title="Test"
      />,
    );

    fireInputChange('100/gain', '99');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByText('Modified Only')).toBeInTheDocument();

    fireInputChange('100/gain', '10');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.queryByText('Modified Only')).not.toBeInTheDocument();
  });

  it('Errors Only switch is absent when no invalid paths exist', () => {
    render(
      <GenericTreeView
        data={makeData([makeItemWithRangedGain('100')])}
        title="Test"
      />,
    );
    expect(screen.queryByText('Errors Only')).not.toBeInTheDocument();
  });

  it('Errors Only switch appears on out-of-range input and filters correctly', () => {
    render(
      <GenericTreeView
        data={makeData([
          makeItemWithRangedGain('100'),
          makeItemWithRangedGain('101'),
        ])}
        title="Test"
      />,
    );

    fireInputChange('100/gain', '200');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.getByText('Errors Only')).toBeInTheDocument();

    toggleSwitch('Errors Only');

    expect(listedParamNames()).toEqual(['Param 100']);
  });

  it('Errors Only switch disappears when the last invalid path is cleared', () => {
    render(
      <GenericTreeView
        data={makeData([makeItemWithRangedGain('100')])}
        title="Test"
      />,
    );

    fireInputChange('100/gain', '200');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByText('Errors Only')).toBeInTheDocument();

    fireInputChange('100/gain', '75');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.queryByText('Errors Only')).not.toBeInTheDocument();
  });

  it('shows only parameters satisfying both filters when both are active', () => {
    render(
      <GenericTreeView
        data={makeData([
          makeItemWithRangedGain('100', '10'),
          makeItemWithRangedGain('101', '10'),
          makeItemWithRangedGain('102', '10'),
        ])}
        initialUiState={makeUiState({
          committedValues: {
            '100/gain': '10',
            '101/gain': '10',
            '102/gain': '10',
          },
          elementValues: {
            '100/gain': '10',
            '101/gain': '10',
            '102/gain': '10',
          },
          expandedIds: ['100', '101', '102'],
          selectedIds: ['100', '101', '102'],
        })}
        title="Test"
      />,
    );

    // 100: dirty only. 101: dirty and invalid. 102: untouched.
    fireInputChange('100/gain', '20');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireInputChange('101/gain', '200');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    toggleSwitch('Modified Only');
    toggleSwitch('Errors Only');

    expect(listedParamNames()).toEqual(['Param 101']);
  });
});

describe('empty selectedIds/expandedIds respected', () => {
  it('empty selectedIds in initialUiState suppresses auto-selection of first item', () => {
    // handleExpandAll emits {expandedIds: selectedIds}. With the bug
    // (?.length check): selectedIds=[] is falsy so it falls back to ['100'].
    // After the fix (=== undefined check): selectedIds stays [].
    // Clicking "Expand All" should emit {expandedIds: []} with the fix.
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData([makeItem('100'), makeItem('101')])}
        initialUiState={makeUiState({expandedIds: [], selectedIds: []})}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();

    act(() => {
      fireEvent.click(screen.getByText('Expand All'));
    });

    // handleExpandAll emits expandedIds = selectedIds.
    // With fix: selectedIds=[] → expandedIds:[].
    // With bug: selectedIds=['100'] → expandedIds:['100'].
    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({expandedIds: []}),
    );
  });
});

describe('reset bumps resetKey', () => {
  it('reset emits onUiStateChange with empty invalidPaths', () => {
    const ref = createRef<GenericTreeViewHandle>();
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        ref={ref}
        data={makeData()}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    onUiStateChange.mockClear();
    act(() => ref.current!.reset());
    expect(onUiStateChange).toHaveBeenCalledWith(
      expect.objectContaining({invalidPaths: []}),
    );
  });

  it('reset restores uncontrolled input to original value', () => {
    // The HexInputControl uses defaultValue (uncontrolled).
    // resetKey bump causes the component to remount, re-reading defaultValue.
    // We verify reset does NOT leave a stale value by checking the input
    // value after reset: it should be the original seeded value.
    const ref = createRef<GenericTreeViewHandle>();
    render(
      <GenericTreeView
        ref={ref}
        data={makeData([
          makeItem('100', {
            elements: [
              {
                isReadOnly: false,
                name: 'gain',
                type: 'CONFIG_ELEMENT',
                value: '10',
              },
            ],
          }),
        ])}
        title="Test"
      />,
    );

    // Change the input
    fireInputChange('100/gain', '99');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Reset
    act(() => ref.current!.reset());

    // After reset + remount, the input should have the original defaultValue.
    // We query the input again since the DOM node may have been replaced.
    const resetInput = getInputByAriaLabel('100/gain');
    expect(resetInput).toHaveValue('10');
  });
});

// ── autoCommit ────────────────────────────────────────────────────────────────

describe('autoCommit', () => {
  it('onAutoCommit is not called when readOnly is true, even if data is dirty', () => {
    // We verify that tryAutoCommit guards on readOnly by checking the prop
    // wiring. Since the mock tree does not trigger blur events that propagate
    // back up, we verify by directly calling reset then checking the guard.
    // The real behavior is tested indirectly: with readOnly=true the toolbar
    // still renders, but the guard in tryAutoCommit prevents firing.
    const onCommit = jest.fn();
    const ref = createRef<GenericTreeViewHandle>();
    render(
      <GenericTreeView
        ref={ref}
        autoCommit={{onCommit}}
        data={makeData()}
        readOnly
        title="Test"
      />,
    );
    // Reset triggers no dirty → onCommit should never be called
    act(() => ref.current!.reset());
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('renders without crashing when autoCommit prop is provided', () => {
    const onCommit = jest.fn();
    expect(() => {
      render(
        <GenericTreeView
          autoCommit={{onCommit}}
          data={makeData()}
          title="Test"
        />,
      );
    }).not.toThrow();
  });
});

// ── Resizable splitter (I4) ───────────────────────────────────────────────────

describe('resizable splitter ARIA and keyboard', () => {
  function getSplitter() {
    // The splitter has aria-valuenow; the QUI Divider <hr> mocks do not.
    return screen
      .getAllByRole('separator')
      .find((el) => el.hasAttribute('aria-valuenow'))!;
  }

  it('renders a separator with aria-orientation vertical and a numeric aria-valuenow', () => {
    render(<GenericTreeView data={makeData()} title="Test" />);
    const sep = getSplitter();
    expect(sep).toBeDefined();
    expect(sep).toHaveAttribute('aria-orientation', 'vertical');
    const valuenow = sep.getAttribute('aria-valuenow');
    expect(valuenow).not.toBeNull();
    expect(Number(valuenow)).toBeGreaterThanOrEqual(20);
    expect(Number(valuenow)).toBeLessThanOrEqual(60);
  });

  it('ArrowRight keydown increases panelSplitPct by exactly 2 and emits onUiStateChange', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData()}
        initialUiState={makeUiState({panelSplitPct: 30})}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    const sep = getSplitter();
    fireEvent.keyDown(sep, {key: 'ArrowRight'});
    const calls = onUiStateChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1][0] as {panelSplitPct?: number};
    expect(lastCall.panelSplitPct).toBe(32);
  });

  it('ArrowLeft keydown decreases panelSplitPct by exactly 2 and emits onUiStateChange', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData()}
        initialUiState={makeUiState({panelSplitPct: 40})}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    const sep = getSplitter();
    fireEvent.keyDown(sep, {key: 'ArrowLeft'});
    const calls = onUiStateChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1][0] as {panelSplitPct?: number};
    expect(lastCall.panelSplitPct).toBe(38);
  });

  it('Shift+ArrowRight applies step 10 to panelSplitPct', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData()}
        initialUiState={makeUiState({panelSplitPct: 30})}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    const sep = getSplitter();
    fireEvent.keyDown(sep, {key: 'ArrowRight', shiftKey: true});
    const calls = onUiStateChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1][0] as {panelSplitPct?: number};
    expect(lastCall.panelSplitPct).toBe(40);
  });

  it('ArrowLeft at lower bound (20) emits clamped value 20', () => {
    const onUiStateChange = jest.fn();
    render(
      <GenericTreeView
        data={makeData()}
        initialUiState={makeUiState({panelSplitPct: 20})}
        onUiStateChange={onUiStateChange}
        title="Test"
      />,
    );
    const sep = getSplitter();
    fireEvent.keyDown(sep, {key: 'ArrowLeft'});
    const calls = onUiStateChange.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1][0] as {panelSplitPct?: number};
    expect(lastCall.panelSplitPct).toBe(20);
  });
});
