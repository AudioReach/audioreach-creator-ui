/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

jest.mock('~features/graph-designer/hooks/use-apply-discard', () => ({
  ...jest.requireActual('~features/graph-designer/hooks/use-apply-discard'),
  useApplyDiscard: jest.fn(),
}));

jest.mock('~shared/store/project-store-registry', () => ({
  projectStoreRegistry: {
    get: jest.fn(() => ({
      getState: () => ({
        releaseExclusiveMode: jest.fn(),
        setActiveExclusiveMode: jest.fn(() => true),
      }),
    })),
  },
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({children, disabled, onClick}: any) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock('@qualcomm-ui/react/dialog', () => ({
  Dialog: {
    Body: ({children}: any) => <div>{children}</div>,
    Description: ({children}: any) => <p>{children}</p>,
    FloatingPortal: ({children}: any) => <div>{children}</div>,
    Footer: ({children}: any) => <div>{children}</div>,
    Heading: ({children}: any) => <h2>{children}</h2>,
    IndicatorIcon: () => <span />,
    Root: ({children, open}: any) => (open ? <div>{children}</div> : null),
  },
}));

jest.mock('@qualcomm-ui/react/icon', () => ({
  Icon: () => <span />,
}));

jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({checked, label, onCheckedChange}: any) => (
    <label>
      <input
        checked={checked ?? false}
        onChange={(e) => onCheckedChange(e.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  ),
}));

jest.mock('@qualcomm-ui/react/radio', () => ({
  Radio: ({label, value}: {label: string; value: string}) => (
    <label>
      <input aria-label={label} readOnly type="radio" value={value} />
      {label}
    </label>
  ),
  RadioGroup: {
    Items: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Root: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  },
}));

import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import type {StoreApi} from 'zustand';

import type {CreateUsecasesResponseDto} from '~entities/edit-session';
import {
  useApplyDiscard,
  type UseApplyDiscardReturn,
} from '~features/graph-designer/hooks/use-apply-discard';
import {
  createGraphDesignerStore,
  type GraphDesignerStore,
} from '~features/graph-designer/model/graph-designer-store';
import {
  type GraphDesignerStoreApi,
  GraphDesignerStoreContext,
} from '~features/graph-designer/model/graph-designer-store-context';
import {ApplyDiscardControls} from '~features/graph-designer/ui/apply-discard-controls';
import {
  createProjectStore,
  type ProjectStore,
  ProjectStoreContext,
} from '~shared/store';

const mockUseApplyDiscard = jest.mocked(useApplyDiscard);

const PROJECT_ID = 'proj-1';

function makeApplyDiscardReturn(
  overrides: Partial<UseApplyDiscardReturn> = {},
): UseApplyDiscardReturn {
  return {
    apply: jest.fn(),
    cancelReview: jest.fn(),
    discard: jest.fn(),
    isBusy: false,
    pendingReview: null,
    submitReview: jest.fn(),
    ...overrides,
  };
}

function makeReviewResponse(
  overrides: Partial<CreateUsecasesResponseDto> = {},
): CreateUsecasesResponseDto {
  return {
    created: [],
    deleted: [],
    issues: [],
    updated: [],
    ...overrides,
  };
}

function makeStore(
  mode: 'edit' | 'view' = 'view',
  isDirty = false,
): StoreApi<GraphDesignerStore> {
  const store = createGraphDesignerStore('tab-1', PROJECT_ID);
  if (mode === 'edit') {
    store.setState({mode: 'edit'});
  }
  if (isDirty) {
    store.getState().markDirty();
  }
  return store;
}

function renderControls(
  store: StoreApi<GraphDesignerStore>,
  projectStore: StoreApi<ProjectStore> = createProjectStore(PROJECT_ID),
) {
  return render(
    <ProjectStoreContext.Provider value={projectStore}>
      <GraphDesignerStoreContext.Provider
        value={store as unknown as GraphDesignerStoreApi}
      >
        <ApplyDiscardControls projectId={PROJECT_ID} />
      </GraphDesignerStoreContext.Provider>
    </ProjectStoreContext.Provider>,
  );
}

describe('ApplyDiscardControls', () => {
  beforeEach(() => {
    mockUseApplyDiscard.mockReturnValue(makeApplyDiscardReturn());
  });

  it('shows only Edit when mode is view', () => {
    const store = makeStore('view');
    renderControls(store);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.queryByText('Apply')).not.toBeInTheDocument();
    expect(screen.queryByText('Discard')).not.toBeInTheDocument();
  });

  it('invokes enterEditMode when Edit is clicked', async () => {
    const store = makeStore('view');
    const enterEditMode = jest.fn().mockResolvedValue(true);
    store.setState({enterEditMode});
    renderControls(store);

    fireEvent.click(screen.getByText('Edit'));

    await waitFor(() => expect(enterEditMode).toHaveBeenCalledTimes(1));
  });

  it('disables Apply and enables Discard when clean and not busy', () => {
    const store = makeStore('edit', false);
    renderControls(store);

    expect(screen.getByText('Apply')).toBeDisabled();
    expect(screen.getByText('Discard')).not.toBeDisabled();
  });

  it('disables both Apply and Discard when dirty and busy', () => {
    mockUseApplyDiscard.mockReturnValue(makeApplyDiscardReturn({isBusy: true}));
    const store = makeStore('edit', true);
    renderControls(store);

    expect(screen.getByText('Apply')).toBeDisabled();
    expect(screen.getByText('Discard')).toBeDisabled();
  });

  it('invokes applyDiscard.apply when Apply is clicked', () => {
    const apply = jest.fn();
    mockUseApplyDiscard.mockReturnValue(makeApplyDiscardReturn({apply}));
    const store = makeStore('edit', true);
    renderControls(store);

    fireEvent.click(screen.getByText('Apply'));

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('opens the discard confirm dialog when dirty and does not discard yet', () => {
    const discard = jest.fn();
    mockUseApplyDiscard.mockReturnValue(makeApplyDiscardReturn({discard}));
    const store = makeStore('edit', true);
    renderControls(store);

    fireEvent.click(screen.getByText('Discard'));

    expect(screen.getByText('Discard all changes?')).toBeInTheDocument();
    expect(discard).not.toHaveBeenCalled();
  });

  it('calls discard once the dialog is confirmed', () => {
    const discard = jest.fn();
    mockUseApplyDiscard.mockReturnValue(makeApplyDiscardReturn({discard}));
    const store = makeStore('edit', true);
    renderControls(store);

    fireEvent.click(screen.getByText('Discard'));
    fireEvent.click(screen.getByText('Discard changes'));

    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('discards directly without opening the dialog when clean', () => {
    const discard = jest.fn();
    mockUseApplyDiscard.mockReturnValue(makeApplyDiscardReturn({discard}));
    const store = makeStore('edit', false);
    renderControls(store);

    fireEvent.click(screen.getByText('Discard'));

    expect(screen.queryByText('Discard all changes?')).not.toBeInTheDocument();
    expect(discard).toHaveBeenCalledTimes(1);
  });

  it('renders the apply summary dialog when pendingReview is non-null', () => {
    mockUseApplyDiscard.mockReturnValue(
      makeApplyDiscardReturn({
        pendingReview: {response: makeReviewResponse()},
      }),
    );
    const store = makeStore('edit', true);
    renderControls(store);

    expect(screen.getByText('Summary')).toBeInTheDocument();
  });

  it('does not render the apply summary dialog when pendingReview is null', () => {
    const store = makeStore('edit', true);
    renderControls(store);

    expect(screen.queryByText('Summary')).not.toBeInTheDocument();
  });

  it('wires submitReview and cancelReview to the apply summary dialog', () => {
    const submitReview = jest.fn();
    const cancelReview = jest.fn();
    mockUseApplyDiscard.mockReturnValue(
      makeApplyDiscardReturn({
        cancelReview,
        pendingReview: {response: makeReviewResponse()},
        submitReview,
      }),
    );
    const store = makeStore('edit', true);
    renderControls(store);

    fireEvent.click(screen.getByText('OK'));
    expect(submitReview).toHaveBeenCalledWith([], 'keep');

    fireEvent.click(screen.getByText('Cancel'));
    expect(cancelReview).toHaveBeenCalledTimes(1);
  });
});
