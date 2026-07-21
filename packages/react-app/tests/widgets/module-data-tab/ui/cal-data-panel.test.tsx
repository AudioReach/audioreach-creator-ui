/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createRef} from 'react';

import {act, fireEvent, render, screen} from '@testing-library/react';
import {createStore, type StoreApi} from 'zustand';

jest.mock('~shared/lib/logger');

const mockGetEditedTreeViewItems = jest.fn();
const mockReset = jest.fn();
let mockCapturedProps: Record<string, unknown> | null = null;

jest.mock('~features/generic-tree-view', () => {
  const React = jest.requireActual('react');
  return {
    GenericTreeView: React.forwardRef(function GenericTreeViewMock(
      props: Record<string, unknown>,
      ref: unknown,
    ) {
      mockCapturedProps = props;
      React.useImperativeHandle(ref, () => ({
        getEditedTreeViewItems: mockGetEditedTreeViewItems,
        getTreeViewData: () => props.data,
        reset: mockReset,
      }));
      return React.createElement('div', {
        'data-testid': 'generic-tree-view',
      });
    }),
  };
});

jest.mock('@qualcomm-ui/react/dialog', () => {
  const React = jest.requireActual('react');
  return {
    Dialog: {
      Body: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Content: ({children}: {children: unknown}) =>
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
      Positioner: ({children}: {children: unknown}) =>
        React.createElement('div', {}, children),
      Root: ({children, open}: {children: unknown; open: boolean}) =>
        open ? React.createElement('div', {}, children) : null,
    },
  };
});

import type {
  CalDataDto,
  CkvDto,
  ParameterDetailDto,
} from '~entities/spf-module-data';
import type {GenericTreeViewHandle} from '~features/generic-tree-view';
import {
  type GraphDesignerStore,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import type {ModuleDataEntry} from '~features/graph-designer/model/module-data-slice';
import {calDataDtoToTreeViewData} from '~widgets/module-data-tab/lib/cal-data-adapter';
import {CalDataPanel} from '~widgets/module-data-tab/ui/cal-data-panel';

const MODULE_ID = 'mod-1';
const MODULE_NAME = 'AudioDecoder';

interface TestStoreShape {
  fetchCalData: jest.Mock;
  moduleDataByModuleId: Record<string, ModuleDataEntry>;
  setCalUiState: jest.Mock;
  updateCalData: jest.Mock;
}

function makeCkvDto(systemId: string, valueLabel: string): CkvDto {
  return {
    keyValueCollection: [
      {
        keyInfo: {keyId: 1, keyLabel: 'Volume', keySystemId: 'key-1'},
        valueInfo: {valueId: 1, valueLabel, valueSystemId: 'val-1'},
      },
    ],
    supportedParameters: [],
    systemId,
  };
}

function makeParam(id: string): ParameterDetailDto {
  return {
    changeInfo: {changeType: 'NONE'},
    elements: [],
    name: `Param ${id}`,
    parameterId: id,
    systemId: id,
  };
}

function makeCalDataDto(overrides?: Partial<CalDataDto>): CalDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    Ckv: [],
    parameters: [makeParam('param-1')],
    systemId: 'ckv-1',
    ...overrides,
  };
}

function makeStore(
  entry: Partial<NonNullable<ModuleDataEntry['calData']>> = {},
): StoreApi<TestStoreShape> {
  return createStore<TestStoreShape>((set, get) => ({
    fetchCalData: jest.fn(async (moduleId: string, ckvSystemId: string) => {
      const existing = get().moduleDataByModuleId[moduleId];
      set({
        moduleDataByModuleId: {
          ...get().moduleDataByModuleId,
          [moduleId]: {
            ...existing,
            calData: {
              ...existing.calData,
              dto: makeCalDataDto({systemId: ckvSystemId}),
              error: undefined,
              selectedCalIndex: ckvSystemId,
              status: 'ready',
            } as ModuleDataEntry['calData'],
          },
        },
      });
      return true;
    }),
    moduleDataByModuleId: {
      [MODULE_ID]: {
        calData: {
          availableCalIndices: [
            makeCkvDto('ckv-1', 'Low'),
            makeCkvDto('ckv-2', 'High'),
          ],
          dto: makeCalDataDto(),
          loadedScope: 'full',
          selectedCalIndex: 'ckv-1',
          status: 'ready',
          ...entry,
        },
        moduleName: MODULE_NAME,
      },
    },
    setCalUiState: jest.fn(),
    updateCalData: jest.fn().mockResolvedValue(makeCalDataDto()),
  }));
}

function renderPanel(
  store: StoreApi<TestStoreShape>,
  ref?: React.Ref<GenericTreeViewHandle>,
) {
  return render(
    <GraphDesignerStoreContext.Provider
      value={store as unknown as StoreApi<GraphDesignerStore>}
    >
      <CalDataPanel ref={ref} moduleId={MODULE_ID} />
    </GraphDesignerStoreContext.Provider>,
  );
}

beforeEach(() => {
  mockCapturedProps = null;
  jest.clearAllMocks();
});

describe('CalDataPanel — status rendering', () => {
  it('renders GenericTreeView when calData status is ready', () => {
    const store = makeStore();
    renderPanel(store);

    expect(screen.getByTestId('generic-tree-view')).toBeInTheDocument();
    expect(mockCapturedProps!.data).toEqual(
      calDataDtoToTreeViewData(makeCalDataDto()),
    );
    expect(mockCapturedProps!.title).toBe(MODULE_NAME);
    expect(mockCapturedProps!.hideToolbar).toBe(false);
    expect(mockCapturedProps!.readOnly).toBe(false);
  });

  it('passes lastMutation as the source on the tree view data', () => {
    const store = makeStore({lastMutation: 'set'});
    renderPanel(store);

    expect(mockCapturedProps!.data).toEqual(
      calDataDtoToTreeViewData(makeCalDataDto(), 'set'),
    );
  });

  it('passes stored uiState as initialUiState', () => {
    const uiState = {
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
      viewMode: 'modern' as const,
    };
    const store = makeStore({uiState});
    renderPanel(store);

    expect(mockCapturedProps!.initialUiState).toBe(uiState);
  });

  it('renders a progress indicator while loading', () => {
    const store = makeStore({dto: undefined, status: 'loading'});
    renderPanel(store);

    expect(screen.getByTestId('q-progress-ring')).toBeInTheDocument();
    expect(screen.queryByTestId('generic-tree-view')).not.toBeInTheDocument();
  });

  it('renders an empty-data message when ready with no dto', () => {
    const store = makeStore({dto: undefined, status: 'ready'});
    renderPanel(store);

    expect(
      screen.getByText('No data available for this module'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('q-progress-ring')).not.toBeInTheDocument();
    expect(screen.queryByTestId('generic-tree-view')).not.toBeInTheDocument();
  });

  it('renders the store error message when status is error', () => {
    const store = makeStore({
      dto: undefined,
      error: 'Module data not found for this module. (AudioDecoder)',
      status: 'error',
    });
    renderPanel(store);

    expect(
      screen.getByText('Module data not found for this module. (AudioDecoder)'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('generic-tree-view')).not.toBeInTheDocument();
  });

  it('renders a progress indicator when no calData entry exists yet', () => {
    const store = createStore<TestStoreShape>(() => ({
      fetchCalData: jest.fn().mockResolvedValue(true),
      moduleDataByModuleId: {
        [MODULE_ID]: {moduleName: MODULE_NAME},
      },
      setCalUiState: jest.fn(),
      updateCalData: jest.fn(),
    }));
    renderPanel(store);

    expect(screen.getByTestId('q-progress-ring')).toBeInTheDocument();
  });
});

describe('CalDataPanel — initial index selection', () => {
  it('defaults to the first available index and fetches when none is selected', async () => {
    const store = makeStore({
      dto: undefined,
      selectedCalIndex: undefined,
      status: 'ready',
    });

    await act(async () => {
      renderPanel(store);
    });

    expect(store.getState().fetchCalData).toHaveBeenCalledTimes(1);
    expect(store.getState().fetchCalData).toHaveBeenCalledWith(
      MODULE_ID,
      'ckv-1',
    );
  });

  it('does not re-fetch when a selected index is already present', async () => {
    const store = makeStore();

    await act(async () => {
      renderPanel(store);
    });

    expect(store.getState().fetchCalData).not.toHaveBeenCalled();
  });
});

describe('CalDataPanel — index Select wiring', () => {
  it('reflects the selected index as the Select value', () => {
    const store = makeStore({selectedCalIndex: 'ckv-2'});
    renderPanel(store);

    expect(screen.getByTestId('q-select')).toHaveValue('ckv-2');
  });

  it('switches directly when not dirty', async () => {
    const store = makeStore({
      uiState: {
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
      },
    });
    renderPanel(store);

    await act(async () => {
      fireEvent.change(screen.getByTestId('q-select'), {
        target: {value: 'ckv-2'},
      });
    });

    expect(store.getState().fetchCalData).toHaveBeenCalledWith(
      MODULE_ID,
      'ckv-2',
    );
    expect(store.getState().updateCalData).not.toHaveBeenCalled();
    expect(screen.queryByText('Set & Switch')).not.toBeInTheDocument();
  });

  it('opens the index-change dialog when dirty', () => {
    const store = makeStore({
      uiState: {
        arrayCounts: {},
        committedValues: {},
        dirtyPaths: ['param-1/gain'],
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
      },
    });
    renderPanel(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'ckv-2'},
    });

    expect(screen.getByText('Set & Switch')).toBeInTheDocument();
    expect(screen.getByText('Discard & Switch')).toBeInTheDocument();
    expect(store.getState().fetchCalData).not.toHaveBeenCalled();
  });

  it('does not open the dialog when the selected value is unchanged', () => {
    const store = makeStore({
      uiState: {
        arrayCounts: {},
        committedValues: {},
        dirtyPaths: ['param-1/gain'],
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
      },
    });
    renderPanel(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'ckv-1'},
    });

    expect(screen.queryByText('Set & Switch')).not.toBeInTheDocument();
    expect(store.getState().fetchCalData).not.toHaveBeenCalled();
  });

  const dirtyUiState = {
    arrayCounts: {},
    committedValues: {},
    dirtyPaths: ['param-1/gain'],
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
    viewMode: 'modern' as const,
  };

  it('Set & Switch dispatches updateCalData then fetches the new index', async () => {
    const originalDto = makeCalDataDto();
    const store = makeStore({dto: originalDto, uiState: dirtyUiState});
    const dirtyItems = [{elements: [], id: 'param-1', name: 'Param param-1'}];
    mockGetEditedTreeViewItems.mockReturnValue(dirtyItems);
    renderPanel(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'ckv-2'},
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Set & Switch'));
    });

    expect(store.getState().updateCalData).toHaveBeenCalledWith(
      MODULE_ID,
      expect.objectContaining({data: expect.any(Array)}),
    );
    expect(store.getState().fetchCalData).toHaveBeenCalledWith(
      MODULE_ID,
      'ckv-2',
    );
    expect(screen.queryByText('Set & Switch')).not.toBeInTheDocument();
  });

  it('Discard & Switch resets local edits then fetches the new index', async () => {
    const store = makeStore({uiState: dirtyUiState});
    renderPanel(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'ckv-2'},
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Discard & Switch'));
    });

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(store.getState().updateCalData).not.toHaveBeenCalled();
    expect(store.getState().fetchCalData).toHaveBeenCalledWith(
      MODULE_ID,
      'ckv-2',
    );
    expect(screen.queryByText('Discard & Switch')).not.toBeInTheDocument();
  });

  it('Cancel dismisses the dialog and keeps the current index', async () => {
    const store = makeStore({uiState: dirtyUiState});
    renderPanel(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'ckv-2'},
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(store.getState().updateCalData).not.toHaveBeenCalled();
    expect(store.getState().fetchCalData).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    expect(screen.getByTestId('q-select')).toHaveValue('ckv-1');
  });
});

describe('CalDataPanel — onUiStateChange wiring', () => {
  it('forwards GenericTreeView ui-state patches to setCalUiState', () => {
    const store = makeStore();
    renderPanel(store);

    const patch = {searchText: 'gain'};
    act(() => {
      (mockCapturedProps!.onUiStateChange as (p: unknown) => void)(patch);
    });

    expect(store.getState().setCalUiState).toHaveBeenCalledWith(
      MODULE_ID,
      patch,
    );
  });
});

describe('CalDataPanel — imperative handle passthrough', () => {
  it('delegates getEditedTreeViewItems, getTreeViewData, and reset', () => {
    const store = makeStore();
    const ref = createRef<GenericTreeViewHandle>();
    const sentinel = [{elements: [], id: 'param-1', name: 'Param param-1'}];
    mockGetEditedTreeViewItems.mockReturnValue(sentinel);
    renderPanel(store, ref);

    expect(ref.current!.getEditedTreeViewItems()).toBe(sentinel);
    expect(ref.current!.getTreeViewData()).toEqual(
      calDataDtoToTreeViewData(makeCalDataDto()),
    );

    act(() => {
      ref.current!.reset();
    });
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
