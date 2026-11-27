/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {createRef} from 'react';

import {act, fireEvent, render, screen} from '@testing-library/react';
import {createStore, type StoreApi} from 'zustand';

jest.mock('~shared/lib/logger', () => ({
  logger: {debug: jest.fn(), error: jest.fn()},
}));
jest.mock('~shared/controls/global-toaster', () => ({showToast: jest.fn()}));

let mockCapturedProps: Record<string, unknown> | null = null;
const mockGetEditedTreeViewItems = jest.fn();
const mockReset = jest.fn();

jest.mock('~features/generic-tree-view', () => {
  const React = jest.requireActual('react');
  const actual = jest.requireActual('~features/generic-tree-view');
  return {
    ...actual,
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

jest.mock('~features/key-configurator', () => ({
  VcpmKeyConfiguratorPanel: () =>
    jest
      .requireActual('react')
      .createElement('div', {'data-testid': 'vcpm-key-configurator-panel'}),
}));

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
      Root: ({children}: {children: unknown}) =>
        React.createElement('div', {'data-testid': 'q-tabs'}, children),
    },
  };
});

import type {VcpmCalDataEntry} from '~features/graph-designer/model/vcpm-data-slice';
import {
  type GraphDesignerStoreApi,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import type {
  ConfiguredCkv,
  GraphKey,
} from '~shared/types/key-configurator-config.types';
import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';
import {
  VcpmDataTab,
  type VcpmDataTabHandle,
} from '~widgets/vcpm-data-tab/ui/vcpm-data-tab';

const SUBGRAPH_ID = 'sg-1';

interface TestStoreShape {
  addVcpmCkvs: jest.Mock;
  configuredVcpmCkvsBySubgraphId: Record<string, ConfiguredCkv[]>;
  deleteVcpmCkv: jest.Mock;
  loadVoiceKeys: jest.Mock;
  mode: 'edit' | 'view';
  selectVcpmCalIndex: jest.Mock;
  setVcpmCalData: jest.Mock;
  setVcpmOpenTab: jest.Mock;
  setVcpmUiState: jest.Mock;
  vcpmDataBySubgraphId: Record<string, VcpmCalDataEntry>;
  voiceKeys: Record<string, GraphKey>;
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
    panelSplitPct: 30,
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

function makeConfiguredCkv(systemId: string, valueName: string): ConfiguredCkv {
  return {
    keyValuePairs: [
      {
        key: {id: 1, name: 'Direction', systemId: 'key-1'},
        value: {id: 1, name: valueName, systemId: `val-${valueName}`},
      },
    ],
    pidConfig: [],
    systemId,
  };
}

function makeEntry(
  overrides: Partial<VcpmCalDataEntry> = {},
): VcpmCalDataEntry {
  return {
    calDataByCkvId: {
      'ckv-1': [{elements: [], name: 'Volume', systemId: 'param-1'}],
    },
    selectedCkvSystemId: 'ckv-1',
    status: 'ready',
    uiState: makeUiState(),
    ...overrides,
  };
}

function makeStore(
  entry: VcpmCalDataEntry | null = makeEntry(),
  storeOverrides: Partial<TestStoreShape> = {},
): StoreApi<TestStoreShape> {
  return createStore<TestStoreShape>((set, get) => ({
    addVcpmCkvs: jest.fn().mockResolvedValue(true),
    configuredVcpmCkvsBySubgraphId: {
      [SUBGRAPH_ID]: [makeConfiguredCkv('ckv-1', 'Tx')],
    },
    deleteVcpmCkv: jest.fn().mockResolvedValue(true),
    loadVoiceKeys: jest.fn().mockResolvedValue(undefined),
    mode: 'edit',
    selectVcpmCalIndex: jest.fn((subgraphSystemId: string, ckvId: string) => {
      const existing = get().vcpmDataBySubgraphId[subgraphSystemId];
      set({
        vcpmDataBySubgraphId: {
          ...get().vcpmDataBySubgraphId,
          [subgraphSystemId]: {...existing, selectedCkvSystemId: ckvId},
        },
      });
    }),
    setVcpmCalData: jest.fn().mockResolvedValue(true),
    setVcpmOpenTab: jest.fn(),
    setVcpmUiState: jest.fn((subgraphSystemId: string, patch: unknown) => {
      const existing = get().vcpmDataBySubgraphId[subgraphSystemId];
      set({
        vcpmDataBySubgraphId: {
          ...get().vcpmDataBySubgraphId,
          [subgraphSystemId]: {
            ...existing,
            uiState: {...existing?.uiState, ...(patch as object)},
          },
        },
      });
    }),
    vcpmDataBySubgraphId: entry ? {[SUBGRAPH_ID]: entry} : {},
    voiceKeys: {},
    ...storeOverrides,
  }));
}

function renderTab(
  store: StoreApi<TestStoreShape>,
  ref?: React.Ref<VcpmDataTabHandle>,
) {
  return render(
    <GraphDesignerStoreContext.Provider
      value={store as unknown as GraphDesignerStoreApi}
    >
      <VcpmDataTab ref={ref} subgraphSystemId={SUBGRAPH_ID} />
    </GraphDesignerStoreContext.Provider>,
  );
}

beforeEach(() => {
  mockCapturedProps = null;
  jest.clearAllMocks();
});

describe('VcpmDataTab — status-gated rendering', () => {
  it('renders a progress indicator while there is no entry yet', () => {
    const store = makeStore(null);
    renderTab(store);

    expect(screen.getByTestId('q-progress-ring')).toBeInTheDocument();
    expect(screen.queryByTestId('generic-tree-view')).not.toBeInTheDocument();
  });

  it('renders a progress indicator while status is loading', () => {
    const store = makeStore(
      makeEntry({calDataByCkvId: undefined, status: 'loading'}),
    );
    renderTab(store);

    expect(screen.getByTestId('q-progress-ring')).toBeInTheDocument();
  });

  it('renders the tree view when status is ready and parameters exist', () => {
    const store = makeStore();
    renderTab(store);

    expect(screen.getByTestId('generic-tree-view')).toBeInTheDocument();
    expect(mockCapturedProps!.readOnly).toBe(false);
  });

  it('renders a no-data message when ready with no selected CKV', () => {
    const store = makeStore(
      makeEntry({calDataByCkvId: {}, selectedCkvSystemId: undefined}),
    );
    renderTab(store);

    expect(
      screen.getByText('No VCPM data available for this subgraph'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('generic-tree-view')).not.toBeInTheDocument();
  });

  it('renders a no-data message when ready with an empty parameter list', () => {
    const store = makeStore(makeEntry({calDataByCkvId: {'ckv-1': []}}));
    renderTab(store);

    expect(
      screen.getByText('No VCPM data available for this subgraph'),
    ).toBeInTheDocument();
  });

  it('keeps the index select visible when multiple CKVs are configured even if the selected CKV has no cal data', () => {
    const store = makeStore(makeEntry({calDataByCkvId: {'ckv-1': []}}), {
      configuredVcpmCkvsBySubgraphId: {
        [SUBGRAPH_ID]: [
          makeConfiguredCkv('ckv-1', 'Tx'),
          makeConfiguredCkv('ckv-2', 'Rx'),
        ],
      },
    });
    renderTab(store);

    expect(screen.getByTestId('q-select')).toBeInTheDocument();
    expect(
      screen.getByText('No VCPM data available for this subgraph'),
    ).toBeInTheDocument();
  });

  it('keeps the index select visible when only a single CKV is configured', () => {
    const store = makeStore(makeEntry(), {
      configuredVcpmCkvsBySubgraphId: {
        [SUBGRAPH_ID]: [makeConfiguredCkv('ckv-1', 'Tx')],
      },
    });
    renderTab(store);

    expect(screen.getByTestId('q-select')).toBeInTheDocument();
  });

  it('hides the index select once the last CKV is removed', () => {
    const store = makeStore(makeEntry(), {
      configuredVcpmCkvsBySubgraphId: {[SUBGRAPH_ID]: []},
    });
    renderTab(store);

    expect(screen.queryByTestId('q-select')).not.toBeInTheDocument();
  });
});

describe('VcpmDataTab — Set gating (not mode-gated)', () => {
  it('disables Set when not dirty, regardless of mode', () => {
    const store = makeStore(makeEntry(), {mode: 'view'});
    renderTab(store);

    expect(screen.getByRole('button', {name: 'Set'})).toBeDisabled();
  });

  it('enables Set when dirty, even in view mode', () => {
    const store = makeStore(
      makeEntry({uiState: makeUiState({dirtyPaths: ['param-1/gain']})}),
      {mode: 'view'},
    );
    renderTab(store);

    expect(screen.getByRole('button', {name: 'Set'})).not.toBeDisabled();
  });

  it('disables Set when dirty but invalid', () => {
    const store = makeStore(
      makeEntry({
        uiState: makeUiState({
          dirtyPaths: ['param-1/gain'],
          invalidPaths: ['param-1/gain'],
        }),
      }),
    );
    renderTab(store);

    expect(screen.getByRole('button', {name: 'Set'})).toBeDisabled();
  });

  it('Get is always enabled and resets the tree view through its ref', () => {
    const store = makeStore();
    renderTab(store);

    expect(screen.getByRole('button', {name: 'Get'})).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name: 'Get'}));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

describe('VcpmDataTab — index switch vs. param selection', () => {
  function makeMultiIndexStore(
    uiStateOverrides: Partial<GenericTreeViewUiState> = {},
  ) {
    return makeStore(makeEntry({uiState: makeUiState(uiStateOverrides)}), {
      configuredVcpmCkvsBySubgraphId: {
        [SUBGRAPH_ID]: [
          makeConfiguredCkv('ckv-1', 'Tx'),
          makeConfiguredCkv('ckv-2', 'Rx'),
        ],
      },
    });
  }

  it('does not open a dialog when ui-state changes report dirty paths (param selection)', () => {
    const store = makeMultiIndexStore();
    renderTab(store);

    act(() => {
      (mockCapturedProps!.onUiStateChange as (p: unknown) => void)({
        dirtyPaths: ['param-1/gain'],
      });
    });

    expect(screen.queryByText('Set & Switch')).not.toBeInTheDocument();
  });

  it('switches directly through the index select when not dirty', () => {
    const store = makeMultiIndexStore();
    renderTab(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'ckv-2'},
    });

    expect(store.getState().selectVcpmCalIndex).toHaveBeenCalledWith(
      SUBGRAPH_ID,
      'ckv-2',
    );
    expect(screen.queryByText('Set & Switch')).not.toBeInTheDocument();
  });

  it('opens the index-switch dialog when dirty and the index select changes', () => {
    const store = makeMultiIndexStore({dirtyPaths: ['param-1/gain']});
    renderTab(store);

    fireEvent.change(screen.getByTestId('q-select'), {
      target: {value: 'ckv-2'},
    });

    expect(screen.getByText('Set & Switch')).toBeInTheDocument();
    expect(screen.getByText('Discard & Switch')).toBeInTheDocument();
    expect(store.getState().selectVcpmCalIndex).not.toHaveBeenCalled();
  });
});

describe('VcpmDataTab — Key Configurator gating', () => {
  it('disables the Key Configurator toggle when mode is not edit', () => {
    const store = makeStore(makeEntry(), {mode: 'view'});
    renderTab(store);

    expect(
      screen.getByRole('button', {name: 'Key Configurator'}),
    ).toBeDisabled();
  });

  it('enables the Key Configurator toggle when mode is edit', () => {
    const store = makeStore(makeEntry(), {mode: 'edit'});
    renderTab(store);

    expect(
      screen.getByRole('button', {name: 'Key Configurator'}),
    ).not.toBeDisabled();
  });

  it('always opens the Key Configurator panel at its min width, ignoring any wider persisted split', () => {
    const store = makeStore(
      makeEntry({uiState: makeUiState({panelSplitPct: 25})}),
    );
    renderTab(store);

    fireEvent.click(screen.getByRole('button', {name: 'Key Configurator'}));

    const panel = screen.getByTestId('vcpm-key-configurator-panel');
    expect(panel.parentElement).toHaveStyle({width: '40%'});
    expect(store.getState().setVcpmUiState).toHaveBeenCalledWith(SUBGRAPH_ID, {
      panelSplitPct: 60,
    });
  });

  it('closes the Key Configurator panel immediately when mode leaves edit', () => {
    const store = makeStore(makeEntry(), {mode: 'edit'});
    renderTab(store);

    fireEvent.click(screen.getByRole('button', {name: 'Key Configurator'}));
    expect(
      screen.getByTestId('vcpm-key-configurator-panel'),
    ).toBeInTheDocument();

    act(() => {
      store.setState({mode: 'view'});
    });

    expect(
      screen.queryByTestId('vcpm-key-configurator-panel'),
    ).not.toBeInTheDocument();
  });
});

describe('VcpmDataTab — confirmClose()', () => {
  it('resolves true immediately with no dialog when not dirty', async () => {
    const store = makeStore(makeEntry());
    const ref = createRef<VcpmDataTabHandle>();
    renderTab(store, ref);

    let resolved: boolean | undefined;
    await act(async () => {
      resolved = await ref.current!.confirmClose();
    });

    expect(resolved).toBe(true);
    expect(screen.queryByText('Set & Close')).not.toBeInTheDocument();
  });

  it('opens the tab-close dialog and defers resolution when dirty', async () => {
    const store = makeStore(
      makeEntry({uiState: makeUiState({dirtyPaths: ['param-1/gain']})}),
    );
    const ref = createRef<VcpmDataTabHandle>();
    renderTab(store, ref);

    let closePromise: Promise<boolean>;
    act(() => {
      closePromise = ref.current!.confirmClose();
    });

    expect(screen.getByText('Set & Close')).toBeInTheDocument();

    let resolved: boolean | undefined;
    await act(async () => {
      fireEvent.click(screen.getByText('Discard & Close'));
      resolved = await closePromise;
    });

    expect(resolved).toBe(true);
    expect(store.getState().setVcpmOpenTab).toHaveBeenCalledWith(
      SUBGRAPH_ID,
      null,
    );
  });
});
