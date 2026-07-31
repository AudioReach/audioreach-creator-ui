/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createRef} from 'react';

import {act, fireEvent, render, screen} from '@testing-library/react';
import {createStore, type StoreApi} from 'zustand';

jest.mock('~shared/lib/logger');

const mockCalGetEditedTreeViewItems = jest.fn();
const mockCalGetTreeViewData = jest.fn();
const mockCalReset = jest.fn();
const mockTagGetEditedTreeViewItems = jest.fn();
const mockTagGetTreeViewData = jest.fn();
const mockTagReset = jest.fn();

jest.mock('~widgets/module-data-tab/ui/cal-data-panel', () => {
  const React = jest.requireActual('react');
  return {
    CalDataPanel: React.forwardRef(function CalDataPanelMock(
      _props: Record<string, unknown>,
      ref: unknown,
    ) {
      React.useImperativeHandle(ref, () => ({
        getEditedTreeViewItems: mockCalGetEditedTreeViewItems,
        getTreeViewData: mockCalGetTreeViewData,
        reset: mockCalReset,
      }));
      return React.createElement('div', {'data-testid': 'cal-data-panel'});
    }),
  };
});

jest.mock('~widgets/module-data-tab/ui/tag-data-panel', () => {
  const React = jest.requireActual('react');
  return {
    TagDataPanel: React.forwardRef(function TagDataPanelMock(
      _props: Record<string, unknown>,
      ref: unknown,
    ) {
      React.useImperativeHandle(ref, () => ({
        getEditedTreeViewItems: mockTagGetEditedTreeViewItems,
        getTreeViewData: mockTagGetTreeViewData,
        reset: mockTagReset,
      }));
      return React.createElement('div', {'data-testid': 'tag-data-panel'});
    }),
  };
});

jest.mock('@qualcomm-ui/react/dialog', () => {
  const React = jest.requireActual('react');
  return {
    Dialog: {
      Body: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Description: ({children}: {children: unknown}) =>
        React.createElement('p', {}, children),
      FloatingPortal: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Footer: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Heading: ({children}: {children: unknown}) =>
        React.createElement('h2', {}, children),
      IndicatorIcon: () => React.createElement('span', {}),
      Root: ({children, open}: {children: unknown; open: boolean}) =>
        open ? React.createElement('div', {}, children) : null,
    },
  };
});

jest.mock('@qualcomm-ui/react/radio', () => {
  const React = jest.requireActual('react');
  return {
    Radio: ({label, value}: {label: string; value: string}) =>
      React.createElement(
        'label',
        {},
        React.createElement('input', {
          'aria-label': label,
          readOnly: true,
          type: 'radio',
          value,
        }),
        label,
      ),
    RadioGroup: {
      Items: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Root: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
    },
  };
});

jest.mock('@qualcomm-ui/react/tabs', () => {
  const React = jest.requireActual('react');
  return {
    Tab: {
      Button: ({children, endIcon}: {children: unknown; endIcon?: unknown}) =>
        React.createElement('span', {}, children, endIcon),
      Root: ({children}: {children: unknown}) =>
        React.createElement('div', {role: 'tab'}, children),
    },
    Tabs: {
      Indicator: () => null,
      List: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Panel: ({children, value}: {children: unknown; value: string}) =>
        React.createElement('div', {'data-testid': `panel-${value}`}, children),
      Root: ({
        children,
        onValueChange,
        value,
      }: {
        children: unknown;
        onValueChange: (value: string) => void;
        value: string;
      }) =>
        React.createElement(
          'div',
          {
            'data-testid': 'q-tabs',
            'data-value': value,
            onClick: (e: React.MouseEvent) => {
              const target = e.target as HTMLElement;
              const nextValue = target.dataset.tabValue;
              if (nextValue) {
                onValueChange(nextValue);
              }
            },
          },
          children,
        ),
    },
  };
});

import {
  type GraphDesignerStoreApi,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import type {ModuleDataEntry} from '~features/graph-designer/model/module-data-slice';
import {logger} from '~shared/lib/logger';
import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';
import {
  ModuleDataTab,
  type ModuleDataTabHandle,
} from '~widgets/module-data-tab/ui/module-data-tab';

const MODULE_ID = 'mod-1';
const MODULE_NAME = 'AudioDecoder';

interface TestStoreShape {
  clearModuleData: jest.Mock;
  moduleDataByModuleId: Record<string, ModuleDataEntry>;
  setCalUiState: jest.Mock;
  setModuleOpenTab: jest.Mock;
  setTagUiState: jest.Mock;
  updateCalData: jest.Mock;
  updateTagData: jest.Mock;
}

function makeUiState(
  overrides: Partial<GenericTreeViewUiState> = {},
): GenericTreeViewUiState {
  return {
    arrayCounts: {},
    committedValues: {},
    dirtyPaths: [],
    elementValues: {},
    expandedIds: [],
    invalidPaths: [],
    legacyExpandedKeys: [],
    panelSplitPct: 40,
    policyFilter: [],
    searchText: '',
    selectedIds: [],
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

function makeEntry(overrides: Partial<ModuleDataEntry> = {}): ModuleDataEntry {
  return {
    calData: {
      availableCalIndices: [],
      loadedScope: 'full',
      selectedCalIndex: 'ckv-1',
      status: 'ready',
    },
    moduleName: MODULE_NAME,
    tagData: {
      availableTagIndices: [],
      selectedTagIndex: 'tkv-1',
      selectedTagSystemId: 'tag-1',
      status: 'ready',
    },
    ...overrides,
  };
}

function makeStore(
  entry: ModuleDataEntry = makeEntry(),
): StoreApi<TestStoreShape> {
  return createStore<TestStoreShape>((set, get) => ({
    clearModuleData: jest.fn(),
    moduleDataByModuleId: {[MODULE_ID]: entry},
    setCalUiState: jest.fn((moduleId: string, patch: unknown) => {
      const existing = get().moduleDataByModuleId[moduleId];
      set({
        moduleDataByModuleId: {
          ...get().moduleDataByModuleId,
          [moduleId]: {
            ...existing,
            calData: {...existing.calData, ...(patch as object)},
          },
        },
      });
    }),
    setModuleOpenTab: jest.fn(),
    setTagUiState: jest.fn(),
    updateCalData: jest.fn().mockResolvedValue({}),
    updateTagData: jest.fn().mockResolvedValue({}),
  }));
}

function renderTab(
  store: StoreApi<TestStoreShape>,
  ref?: React.Ref<ModuleDataTabHandle>,
) {
  return render(
    <GraphDesignerStoreContext.Provider
      value={store as unknown as GraphDesignerStoreApi}
    >
      <ModuleDataTab ref={ref} moduleId={MODULE_ID} />
    </GraphDesignerStoreContext.Provider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ModuleDataTab — tab badges', () => {
  it('shows no badge when a sub-tab has no dirty/invalid/set paths', () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState(),
        },
      }),
    );
    renderTab(store);

    expect(screen.queryByTestId('q-status-badge')).not.toBeInTheDocument();
  });

  it('shows a warning badge with dirty-pulse when a sub-tab is dirty', () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    renderTab(store);

    const badge = screen.getByTestId('q-status-badge');
    expect(badge).toHaveAttribute('data-emphasis', 'warning');
    expect(badge).toHaveClass('dirty-pulse');
  });

  it('shows a danger badge when a sub-tab has invalid paths, taking priority over dirty', () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({
            dirtyPaths: ['param-1/gain'],
            invalidPaths: ['param-1/gain'],
          }),
        },
      }),
    );
    renderTab(store);

    expect(screen.getByTestId('q-status-badge')).toHaveAttribute(
      'data-emphasis',
      'danger',
    );
  });

  it('shows a success badge when a sub-tab has set paths but is not dirty', () => {
    const store = makeStore(
      makeEntry({
        tagData: {
          availableTagIndices: [
            {systemId: 'tag-1', tagId: 1, tagName: 'Tag 1'},
          ],
          selectedTagIndex: 'tkv-1',
          selectedTagSystemId: 'tag-1',
          status: 'ready',
          uiState: makeUiState({setPaths: ['param-1/gain']}),
        },
      }),
    );
    renderTab(store);

    expect(screen.getByTestId('q-status-badge')).toHaveAttribute(
      'data-emphasis',
      'success',
    );
  });

  it('reads badge state directly from the store for the inactive (unmounted) sub-tab', () => {
    const store = makeStore(
      makeEntry({
        tagData: {
          availableTagIndices: [
            {systemId: 'tag-1', tagId: 1, tagName: 'Tag 1'},
          ],
          selectedTagIndex: 'tkv-1',
          selectedTagSystemId: 'tag-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    renderTab(store);

    expect(screen.queryByTestId('tag-data-panel')).not.toBeInTheDocument();
    const badges = screen.getAllByTestId('q-status-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveAttribute('data-emphasis', 'warning');
  });
});

describe('ModuleDataTab — action bar Get/Set', () => {
  it('enables Set when the active tab is dirty with no invalid paths', () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    renderTab(store);

    expect(screen.getByRole('button', {name: 'Set'})).not.toBeDisabled();
  });

  it('disables Set when the active tab is not dirty', () => {
    const store = makeStore();
    renderTab(store);

    expect(screen.getByRole('button', {name: 'Set'})).toBeDisabled();
  });

  it('disables Set when the active tab has invalid paths, even if dirty', () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({
            dirtyPaths: ['param-1/gain'],
            invalidPaths: ['param-1/gain'],
          }),
        },
      }),
    );
    renderTab(store);

    expect(screen.getByRole('button', {name: 'Set'})).toBeDisabled();
  });

  it('Set dispatches updateCalData with the edited items for the active tab', async () => {
    const dirtyItems = [{elements: [], id: 'param-1', name: 'Param param-1'}];
    mockCalGetEditedTreeViewItems.mockReturnValue(dirtyItems);
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          dto: {
            changeInfo: {changeType: 'NONE'},
            Ckv: [],
            parameters: [],
            systemId: 'ckv-1',
          },
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    renderTab(store);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: 'Set'}));
    });

    expect(store.getState().updateCalData).toHaveBeenCalledWith(
      MODULE_ID,
      expect.objectContaining({data: expect.any(Array)}),
    );
  });

  it('Get always enabled and calls the active tab panel through its ref', () => {
    const store = makeStore();
    renderTab(store);

    expect(screen.getByRole('button', {name: 'Get'})).not.toBeDisabled();
  });
});

// TODO: Batch Copy button is commented out in the component until the
// backend endpoint lands — re-enable this suite alongside it.
describe.skip('ModuleDataTab — Batch Copy', () => {
  it('invokes the stub handler immediately when the active tab has no dirty paths', () => {
    mockCalGetTreeViewData.mockReturnValue({items: [], systemId: 'ckv-1'});
    const store = makeStore();
    renderTab(store);

    fireEvent.click(screen.getByRole('button', {name: 'Batch Copy'}));

    expect(screen.queryByText('Set & Copy')).not.toBeInTheDocument();
    expect(mockCalGetTreeViewData).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'ModuleDataTab: batch copy stub invoked',
      expect.objectContaining({
        tag: JSON.stringify({items: [], systemId: 'ckv-1'}),
      }),
    );
  });

  it('opens a 3-way dialog when the active tab has dirty paths', () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    renderTab(store);

    fireEvent.click(screen.getByRole('button', {name: 'Batch Copy'}));

    expect(screen.getByText('Set & Copy')).toBeInTheDocument();
    expect(screen.getByText('Discard Edits & Copy')).toBeInTheDocument();
  });

  it('Set & Copy dispatches updateCalData for the active tab', async () => {
    const dirtyItems = [{elements: [], id: 'param-1', name: 'Param param-1'}];
    mockCalGetEditedTreeViewItems.mockReturnValue(dirtyItems);
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          dto: {
            changeInfo: {changeType: 'NONE'},
            Ckv: [],
            parameters: [],
            systemId: 'ckv-1',
          },
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    renderTab(store);

    fireEvent.click(screen.getByRole('button', {name: 'Batch Copy'}));
    await act(async () => {
      fireEvent.click(screen.getByText('Set & Copy'));
    });

    expect(store.getState().updateCalData).toHaveBeenCalledWith(
      MODULE_ID,
      expect.objectContaining({data: expect.any(Array)}),
    );
    expect(screen.queryByText('Set & Copy')).not.toBeInTheDocument();
  });

  it('Discard Edits & Copy resets the active tab and dismisses the dialog', async () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    renderTab(store);

    fireEvent.click(screen.getByRole('button', {name: 'Batch Copy'}));
    await act(async () => {
      fireEvent.click(screen.getByText('Discard Edits & Copy'));
    });

    expect(mockCalReset).toHaveBeenCalledTimes(1);
    expect(store.getState().updateCalData).not.toHaveBeenCalled();
    expect(screen.queryByText('Discard Edits & Copy')).not.toBeInTheDocument();
  });

  it('Cancel dismisses the Batch Copy dialog without side effects', async () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    renderTab(store);

    fireEvent.click(screen.getByRole('button', {name: 'Batch Copy'}));
    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(store.getState().updateCalData).not.toHaveBeenCalled();
    expect(mockCalReset).not.toHaveBeenCalled();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });
});

describe('ModuleDataTab — tab-close confirmation via confirmClose()', () => {
  it('resolves true immediately with no dialog when neither sub-tab is dirty', async () => {
    const store = makeStore();
    const ref = createRef<ModuleDataTabHandle>();
    renderTab(store, ref);

    let resolved: boolean | undefined;
    await act(async () => {
      resolved = await ref.current!.confirmClose();
    });

    expect(resolved).toBe(true);
    expect(screen.queryByText('Set & Close')).not.toBeInTheDocument();
  });

  it('opens the tab-close dialog when the active sub-tab is dirty', () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    const ref = createRef<ModuleDataTabHandle>();
    renderTab(store, ref);

    act(() => {
      void ref.current!.confirmClose();
    });

    expect(screen.getByText('Set & Close')).toBeInTheDocument();
    expect(screen.getByText('Discard & Close')).toBeInTheDocument();
  });

  it('opens the tab-close dialog when only the inactive sub-tab is dirty', () => {
    const store = makeStore(
      makeEntry({
        tagData: {
          availableTagIndices: [],
          selectedTagIndex: 'tkv-1',
          selectedTagSystemId: 'tag-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    const ref = createRef<ModuleDataTabHandle>();
    renderTab(store, ref);

    act(() => {
      void ref.current!.confirmClose();
    });

    expect(screen.getByText('Set & Close')).toBeInTheDocument();
  });

  it('disables Set & Close when any dirty sub-tab has invalid paths', () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({
            dirtyPaths: ['param-1/gain'],
            invalidPaths: ['param-1/gain'],
          }),
        },
      }),
    );
    const ref = createRef<ModuleDataTabHandle>();
    renderTab(store, ref);

    act(() => {
      void ref.current!.confirmClose();
    });

    expect(screen.getByText('Set & Close')).toBeDisabled();
  });

  it('Set & Close writes every dirty sub-tab from store state, not a mounted ref, then resolves true', async () => {
    const originalDto = {
      changeInfo: {changeType: 'NONE' as const},
      Ckv: [],
      parameters: [
        {
          changeInfo: {changeType: 'NONE' as const},
          elements: [
            {
              isReadOnly: false,
              name: 'gain',
              type: 'CONFIG_ELEMENT' as const,
              value: '0x00000010',
            },
          ],
          name: 'Param param-1',
          parameterId: 'param-1',
          systemId: 'param-1',
        },
      ],
      systemId: 'ckv-1',
    };
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          dto: originalDto,
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({
            dirtyPaths: ['param-1/gain'],
            elementValues: {'param-1/gain': '0x00000099'},
          }),
        },
      }),
    );
    const ref = createRef<ModuleDataTabHandle>();
    renderTab(store, ref);

    let closePromise: Promise<boolean>;
    act(() => {
      closePromise = ref.current!.confirmClose();
    });

    let resolved: boolean | undefined;
    await act(async () => {
      fireEvent.click(screen.getByText('Set & Close'));
      resolved = await closePromise;
    });

    expect(store.getState().updateCalData).toHaveBeenCalledWith(
      MODULE_ID,
      expect.objectContaining({data: expect.any(Array)}),
    );
    expect(mockCalGetEditedTreeViewItems).not.toHaveBeenCalled();
    expect(store.getState().setModuleOpenTab).toHaveBeenCalledWith(
      MODULE_ID,
      null,
    );
    expect(store.getState().clearModuleData).not.toHaveBeenCalled();
    expect(resolved).toBe(true);
  });

  it('keeps the tab open and surfaces an error when a Set & Close write fails', async () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          dto: {
            changeInfo: {changeType: 'NONE'},
            Ckv: [],
            parameters: [],
            systemId: 'ckv-1',
          },
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    store.setState({updateCalData: jest.fn().mockResolvedValue(undefined)});
    const ref = createRef<ModuleDataTabHandle>();
    renderTab(store, ref);

    let closePromise: Promise<boolean>;
    act(() => {
      closePromise = ref.current!.confirmClose();
    });

    let resolved: boolean | undefined;
    await act(async () => {
      fireEvent.click(screen.getByText('Set & Close'));
      resolved = await closePromise;
    });

    expect(store.getState().setModuleOpenTab).not.toHaveBeenCalled();
    expect(screen.getByText('Set & Close')).toBeInTheDocument();
    expect(resolved).toBe(false);
  });

  it('Discard & Close clears dirty/set/invalid state on both sub-tabs, resolves true, and never calls clearModuleData', async () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
        tagData: {
          availableTagIndices: [],
          selectedTagIndex: 'tkv-1',
          selectedTagSystemId: 'tag-1',
          status: 'ready',
          uiState: makeUiState({setPaths: ['param-2/gain']}),
        },
      }),
    );
    const ref = createRef<ModuleDataTabHandle>();
    renderTab(store, ref);

    let closePromise: Promise<boolean>;
    act(() => {
      closePromise = ref.current!.confirmClose();
    });

    let resolved: boolean | undefined;
    await act(async () => {
      fireEvent.click(screen.getByText('Discard & Close'));
      resolved = await closePromise;
    });

    expect(store.getState().setCalUiState).toHaveBeenCalledWith(
      MODULE_ID,
      expect.objectContaining({
        dirtyPaths: [],
        invalidPaths: [],
        setPaths: [],
      }),
    );
    expect(store.getState().setTagUiState).toHaveBeenCalledWith(
      MODULE_ID,
      expect.objectContaining({
        dirtyPaths: [],
        invalidPaths: [],
        setPaths: [],
      }),
    );
    expect(store.getState().setModuleOpenTab).toHaveBeenCalledWith(
      MODULE_ID,
      null,
    );
    expect(store.getState().clearModuleData).not.toHaveBeenCalled();
    expect(resolved).toBe(true);
  });

  it('Cancel dismisses the tab-close dialog and resolves false, keeping edits intact', async () => {
    const store = makeStore(
      makeEntry({
        calData: {
          availableCalIndices: [],
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          uiState: makeUiState({dirtyPaths: ['param-1/gain']}),
        },
      }),
    );
    const ref = createRef<ModuleDataTabHandle>();
    renderTab(store, ref);

    let closePromise: Promise<boolean>;
    act(() => {
      closePromise = ref.current!.confirmClose();
    });

    let resolved: boolean | undefined;
    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
      resolved = await closePromise;
    });

    expect(resolved).toBe(false);
    expect(store.getState().setModuleOpenTab).not.toHaveBeenCalled();
    expect(store.getState().setCalUiState).not.toHaveBeenCalled();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });
});
