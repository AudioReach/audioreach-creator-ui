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

import type {
  ParameterDetailDto,
  TagDataDto,
  TagInfoDto,
} from '~entities/spf-module-data';
import type {GenericTreeViewHandle} from '~features/generic-tree-view';
import {
  type GraphDesignerStore,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import type {ModuleDataEntry} from '~features/graph-designer/model/module-data-slice';
import {tagDataDtoToTreeViewData} from '~widgets/module-data-tab/lib/tag-data-adapter';
import {TagDataPanel} from '~widgets/module-data-tab/ui/tag-data-panel';

const MODULE_ID = 'mod-1';
const MODULE_NAME = 'AudioDecoder';

interface TestStoreShape {
  fetchTagData: jest.Mock;
  moduleDataByModuleId: Record<string, ModuleDataEntry>;
  setTagUiState: jest.Mock;
  updateTagData: jest.Mock;
}

function makeTagInfoDto(
  systemId: string,
  valueLabel: string,
  tkvSystemId: string,
): TagInfoDto {
  return {
    systemId,
    tagId: 1,
    tagName: 'volume-tag',
    tkvs: [
      {
        keyValueCollection: [
          {
            keyInfo: {keyId: 1, keyLabel: 'Volume', keySystemId: 'key-1'},
            valueInfo: {valueId: 1, valueLabel, valueSystemId: 'val-1'},
          },
        ],
        supportedParameters: [],
        systemId: tkvSystemId,
      },
    ],
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

function makeTagDataDto(overrides?: Partial<TagDataDto>): TagDataDto {
  return {
    changeInfo: {changeType: 'NONE'},
    parameters: [makeParam('param-1')],
    systemId: 'tkv-1',
    Tkv: [],
    ...overrides,
  };
}

function makeStore(
  entry: Partial<NonNullable<ModuleDataEntry['tagData']>> = {},
): StoreApi<TestStoreShape> {
  return createStore<TestStoreShape>((set, get) => ({
    fetchTagData: jest.fn(
      async (moduleId: string, tagSystemId: string, tkvSystemId: string) => {
        const existing = get().moduleDataByModuleId[moduleId];
        set({
          moduleDataByModuleId: {
            ...get().moduleDataByModuleId,
            [moduleId]: {
              ...existing,
              tagData: {
                ...existing.tagData,
                dto: makeTagDataDto({systemId: tkvSystemId}),
                error: undefined,
                selectedTagIndex: tkvSystemId,
                selectedTagSystemId: tagSystemId,
                status: 'ready',
              } as ModuleDataEntry['tagData'],
            },
          },
        });
        return true;
      },
    ),
    moduleDataByModuleId: {
      [MODULE_ID]: {
        moduleName: MODULE_NAME,
        tagData: {
          availableTagIndices: [
            makeTagInfoDto('tag-1', 'Low', 'tkv-1'),
            makeTagInfoDto('tag-2', 'High', 'tkv-2'),
          ],
          dto: makeTagDataDto(),
          selectedTagIndex: 'tkv-1',
          selectedTagSystemId: 'tag-1',
          status: 'ready',
          ...entry,
        },
      },
    },
    setTagUiState: jest.fn(),
    updateTagData: jest.fn().mockResolvedValue(makeTagDataDto()),
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
      <TagDataPanel ref={ref} moduleId={MODULE_ID} />
    </GraphDesignerStoreContext.Provider>,
  );
}

beforeEach(() => {
  mockCapturedProps = null;
  jest.clearAllMocks();
});

describe('TagDataPanel — status rendering', () => {
  it('renders GenericTreeView when tagData status is ready', () => {
    const store = makeStore();
    renderPanel(store);

    expect(screen.getByTestId('generic-tree-view')).toBeInTheDocument();
    expect(mockCapturedProps!.data).toEqual(
      tagDataDtoToTreeViewData(makeTagDataDto()),
    );
    expect(mockCapturedProps!.title).toBe(MODULE_NAME);
    expect(mockCapturedProps!.hideToolbar).toBe(false);
    expect(mockCapturedProps!.readOnly).toBe(false);
  });

  it('passes lastMutation as the source on the tree view data', () => {
    const store = makeStore({lastMutation: 'set'});
    renderPanel(store);

    expect(mockCapturedProps!.data).toEqual(
      tagDataDtoToTreeViewData(makeTagDataDto(), 'set'),
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

  it('renders a progress indicator when no tagData entry exists yet', () => {
    const store = createStore<TestStoreShape>(() => ({
      fetchTagData: jest.fn().mockResolvedValue(true),
      moduleDataByModuleId: {
        [MODULE_ID]: {moduleName: MODULE_NAME},
      },
      setTagUiState: jest.fn(),
      updateTagData: jest.fn(),
    }));
    renderPanel(store);

    expect(screen.getByTestId('q-progress-ring')).toBeInTheDocument();
  });
});

describe('TagDataPanel — initial index selection', () => {
  it('defaults to the first available tag/tkv pair and fetches when none is selected', async () => {
    const store = makeStore({
      dto: undefined,
      selectedTagIndex: undefined,
      selectedTagSystemId: undefined,
      status: 'ready',
    });

    await act(async () => {
      renderPanel(store);
    });

    expect(store.getState().fetchTagData).toHaveBeenCalledTimes(1);
    expect(store.getState().fetchTagData).toHaveBeenCalledWith(
      MODULE_ID,
      'tag-1',
      'tkv-1',
    );
  });

  it('does not re-fetch when a selected index is already present', async () => {
    const store = makeStore();

    await act(async () => {
      renderPanel(store);
    });

    expect(store.getState().fetchTagData).not.toHaveBeenCalled();
  });
});

describe('TagDataPanel — index Select wiring', () => {
  it('reflects the selected tkv index as the Select value', () => {
    const store = makeStore({
      selectedTagIndex: 'tkv-2',
      selectedTagSystemId: 'tag-2',
    });
    renderPanel(store);

    expect(screen.getByTestId('q-select')).toHaveValue('tkv-2');
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
        target: {value: 'tkv-2'},
      });
    });

    expect(store.getState().fetchTagData).toHaveBeenCalledWith(
      MODULE_ID,
      'tag-2',
      'tkv-2',
    );
    expect(store.getState().updateTagData).not.toHaveBeenCalled();
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
      target: {value: 'tkv-2'},
    });

    expect(screen.getByText('Set & Switch')).toBeInTheDocument();
    expect(screen.getByText('Discard & Switch')).toBeInTheDocument();
    expect(store.getState().fetchTagData).not.toHaveBeenCalled();
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
      target: {value: 'tkv-1'},
    });

    expect(screen.queryByText('Set & Switch')).not.toBeInTheDocument();
    expect(store.getState().fetchTagData).not.toHaveBeenCalled();
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

  it('Set & Switch dispatches updateTagData then fetches the new index', async () => {
    const originalDto = makeTagDataDto();
    const store = makeStore({dto: originalDto, uiState: dirtyUiState});
    const dirtyItems = [{elements: [], id: 'param-1', name: 'Param param-1'}];
    mockGetEditedTreeViewItems.mockReturnValue(dirtyItems);
    renderPanel(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'tkv-2'},
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Set & Switch'));
    });

    expect(store.getState().updateTagData).toHaveBeenCalledWith(
      MODULE_ID,
      expect.objectContaining({data: expect.any(Array)}),
    );
    expect(store.getState().fetchTagData).toHaveBeenCalledWith(
      MODULE_ID,
      'tag-2',
      'tkv-2',
    );
    expect(screen.queryByText('Set & Switch')).not.toBeInTheDocument();
  });

  it('Discard & Switch resets local edits then fetches the new index', async () => {
    const store = makeStore({uiState: dirtyUiState});
    renderPanel(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'tkv-2'},
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Discard & Switch'));
    });

    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(store.getState().updateTagData).not.toHaveBeenCalled();
    expect(store.getState().fetchTagData).toHaveBeenCalledWith(
      MODULE_ID,
      'tag-2',
      'tkv-2',
    );
    expect(screen.queryByText('Discard & Switch')).not.toBeInTheDocument();
  });

  it('Cancel dismisses the dialog and keeps the current index', async () => {
    const store = makeStore({uiState: dirtyUiState});
    renderPanel(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'tkv-2'},
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(store.getState().updateTagData).not.toHaveBeenCalled();
    expect(store.getState().fetchTagData).not.toHaveBeenCalled();
    expect(mockReset).not.toHaveBeenCalled();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    expect(screen.getByTestId('q-select')).toHaveValue('tkv-1');
  });
});

describe('TagDataPanel — onUiStateChange wiring', () => {
  it('forwards GenericTreeView ui-state patches to setTagUiState', () => {
    const store = makeStore();
    renderPanel(store);

    const patch = {searchText: 'gain'};
    act(() => {
      (mockCapturedProps!.onUiStateChange as (p: unknown) => void)(patch);
    });

    expect(store.getState().setTagUiState).toHaveBeenCalledWith(
      MODULE_ID,
      patch,
    );
  });
});

describe('TagDataPanel — imperative handle passthrough', () => {
  it('delegates getEditedTreeViewItems, getTreeViewData, and reset', () => {
    const store = makeStore();
    const ref = createRef<GenericTreeViewHandle>();
    const sentinel = [{elements: [], id: 'param-1', name: 'Param param-1'}];
    mockGetEditedTreeViewItems.mockReturnValue(sentinel);
    renderPanel(store, ref);

    expect(ref.current!.getEditedTreeViewItems()).toBe(sentinel);
    expect(ref.current!.getTreeViewData()).toEqual(
      tagDataDtoToTreeViewData(makeTagDataDto()),
    );

    act(() => {
      ref.current!.reset();
    });
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
