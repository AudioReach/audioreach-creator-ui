/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');
jest.mock('~shared/store/global-store', () => ({
  useGlobalStore: {
    getState: jest.fn(() => ({
      selectedUsecaseIds: ['uc-existing'],
    })),
  },
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
jest.mock('~entities/usecases/api/usecases-api');
jest.mock('~entities/edit-session/api/edit-session-api');
jest.mock('~shared/controls/global-toaster');
jest.mock('~shared/store', () => ({
  ...jest.requireActual('~shared/store'),
  tabFocusRegistry: {
    focusTab: jest.fn(),
  },
}));
jest.mock('~features/graph-designer/model/apply-discard-coordinator');

import {act, renderHook} from '@testing-library/react';
import type {StoreApi} from 'zustand';

import type {ApiIssueItem} from '~entities/api-issues';
import type {CreateUsecasesResponseDto} from '~entities/edit-session';
import {
  getSubgraphsByIds,
  getUsecaseComponents,
} from '~entities/usecases/api/usecases-api';
import {useApplyDiscard} from '~features/graph-designer/hooks/use-apply-discard';
import * as coordinator from '~features/graph-designer/model/apply-discard-coordinator';
import type {
  DiscardOutcome,
  FinalizeOutcome,
  ReconcileOutcome,
} from '~features/graph-designer/model/apply-discard.types';
import {
  createGraphDesignerStore,
  type GraphDesignerStore,
} from '~features/graph-designer/model/graph-designer-store';
import {
  type GraphDesignerStoreApi,
  GraphDesignerStoreContext,
} from '~features/graph-designer/model/graph-designer-store-context';
import {showToast} from '~shared/controls/global-toaster';
import {tabFocusRegistry} from '~shared/store';

const mockRunApplyReconcile = jest.mocked(coordinator.runApplyReconcile);
const mockRunFinalize = jest.mocked(coordinator.runFinalize);
const mockRunDiscard = jest.mocked(coordinator.runDiscard);
const mockShowToast = jest.mocked(showToast);
const mockFocusTab = jest.mocked(tabFocusRegistry.focusTab);
const mockGetUsecaseComponents = jest.mocked(getUsecaseComponents);
const mockGetSubgraphsByIds = jest.mocked(getSubgraphsByIds);

const PROJECT_ID = 'proj-1';

function makeIssue(overrides: Partial<ApiIssueItem> = {}): ApiIssueItem {
  return {
    code: 'ISSUE_CODE',
    message: 'Something happened',
    severity: 'WARNING',
    ...overrides,
  };
}

function makeReviewResponse(
  overrides: Partial<CreateUsecasesResponseDto> = {},
): CreateUsecasesResponseDto {
  return {
    created: [
      {
        changeId: 'change-1',
        keyValueCollection: [],
        systemId: 'uc-new-1',
        usecaseType: 'Regular',
      },
    ],
    deleted: [],
    issues: [],
    updated: [],
    ...overrides,
  };
}

function makeStore(): StoreApi<GraphDesignerStore> {
  const store = createGraphDesignerStore('tab-1', PROJECT_ID);
  store.getState().enterEditMode();
  return store;
}

function renderApplyDiscard(
  store: StoreApi<GraphDesignerStore>,
  routingTriggered = true,
) {
  return renderHook(
    () => useApplyDiscard({projectId: PROJECT_ID, routingTriggered}),
    {
      wrapper: ({children}) => (
        <GraphDesignerStoreContext.Provider
          value={store as unknown as GraphDesignerStoreApi}
        >
          {children}
        </GraphDesignerStoreContext.Provider>
      ),
    },
  );
}

function mockSuccessfulReload(): void {
  mockGetUsecaseComponents.mockResolvedValue({
    data: {
      controlLinks: [],
      dataLinks: [],
      spfModules: [],
      subsystems: [],
    },
    message: 'ok',
    success: true,
  });
}

function mockFailedReload(): void {
  mockGetUsecaseComponents.mockResolvedValue({
    message: 'reload failed',
    success: false,
  });
}

describe('useApplyDiscard', () => {
  beforeEach(() => {
    mockSuccessfulReload();
    mockGetSubgraphsByIds.mockResolvedValue({
      data: [],
      message: undefined as never,
      success: true,
    });
  });

  describe('apply — reconcile outcomes', () => {
    it('finalizeDirectly proceeds to finalize with empty checkedChangeIds and keep nav', async () => {
      const store = makeStore();
      store.getState().markDirty();
      mockRunApplyReconcile.mockResolvedValue({kind: 'finalizeDirectly'});
      mockRunFinalize.mockResolvedValue({
        kind: 'committed',
        sessionMode: 'READONLY',
        summary: 'done',
      });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.apply();
      });

      expect(mockRunFinalize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({checkedChangeIds: []}),
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('applied'),
        'success',
      );
    });

    it('blocked shows a danger toast, publishes issue rows, and focuses the tab', async () => {
      const store = makeStore();
      store.getState().markDirty();
      const fatalIssue = makeIssue({message: 'Fatal', severity: 'FATAL'});
      mockRunApplyReconcile.mockResolvedValue({
        issues: [fatalIssue],
        kind: 'blocked',
      });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.apply();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('blocked'),
        'danger',
      );
      expect(store.getState().validationResults).toHaveLength(1);
      expect(store.getState().validationResults[0].errorCode).toBe(
        'ISSUE_CODE',
      );
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(store.getState().mode).toBe('edit');
      expect(store.getState().isDirty).toBe(true);
      expect(mockRunFinalize).not.toHaveBeenCalled();
    });

    it('emptyReconcile publishes notices then proceeds to finalize', async () => {
      const store = makeStore();
      store.getState().markDirty();
      const notice = makeIssue({message: 'Notice'});
      mockRunApplyReconcile.mockResolvedValue({
        kind: 'emptyReconcile',
        notices: [notice],
      });
      mockRunFinalize.mockResolvedValue({
        kind: 'committed',
        sessionMode: 'READONLY',
        summary: 'done',
      });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.apply();
      });

      expect(store.getState().validationResults).toHaveLength(1);
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(mockRunFinalize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({checkedChangeIds: []}),
      );
    });

    it('reconcileTransportIndeterminate shows a reload warning and asserts nothing', async () => {
      const store = makeStore();
      store.getState().markDirty();
      mockRunApplyReconcile.mockResolvedValue({
        kind: 'reconcileTransportIndeterminate',
      });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.apply();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload'),
        'warning',
      );
      expect(store.getState().validationResults).toHaveLength(0);
      expect(store.getState().mode).toBe('edit');
      expect(store.getState().isDirty).toBe(true);
    });

    it('reconcileFailed shows a danger toast and publishes one inline row', async () => {
      const store = makeStore();
      store.getState().markDirty();
      mockRunApplyReconcile.mockResolvedValue({
        kind: 'reconcileFailed',
        message: 'Failed to reconcile staged changes',
      });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.apply();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        'danger',
      );
      expect(store.getState().validationResults).toEqual([
        expect.objectContaining({
          errorCode: 'create-usecases-failed',
          message: 'Failed to reconcile staged changes',
          severity: 'error',
        }),
      ]);
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(store.getState().mode).toBe('edit');
      expect(store.getState().isDirty).toBe(true);
    });

    it('review publishes notices, focuses the tab, and opens the dialog without touching mode', async () => {
      const store = makeStore();
      store.getState().markDirty();
      const notice = makeIssue({message: 'Notice'});
      const response = makeReviewResponse();
      mockRunApplyReconcile.mockResolvedValue({
        kind: 'review',
        notices: [notice],
        response,
      });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.apply();
      });

      expect(store.getState().validationResults).toHaveLength(1);
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(result.current.pendingReview).toEqual({response});
      expect(store.getState().mode).toBe('edit');
      expect(store.getState().isDirty).toBe(true);
      expect(mockRunFinalize).not.toHaveBeenCalled();
    });
  });

  describe('submitReview — finalize outcomes', () => {
    async function openReview(
      store: StoreApi<GraphDesignerStore>,
      response: CreateUsecasesResponseDto = makeReviewResponse(),
    ) {
      store.getState().markDirty();
      mockRunApplyReconcile.mockResolvedValue({
        kind: 'review',
        notices: [],
        response,
      });
      const rendered = renderApplyDiscard(store);
      await act(async () => {
        await rendered.result.current.apply();
      });
      return rendered;
    }

    it('stageFailed shows a danger toast, publishes mapped rows, and records processed ids', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      const outcome: FinalizeOutcome = {
        failedChangeIds: ['b'],
        kind: 'stageFailed',
        message: 'stage failed',
        notYetStagedChangeIds: ['b'],
        processedChangeIds: ['a'],
      };
      mockRunFinalize.mockResolvedValue(outcome);

      await act(async () => {
        await result.current.submitReview(['a', 'b'], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Stage failed'),
        'danger',
      );
      expect(store.getState().validationResults.length).toBeGreaterThan(0);
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(store.getState().stagedProcessedChangeIds).toEqual(['a']);
      expect(store.getState().mode).toBe('edit');
      expect(store.getState().isDirty).toBe(true);
    });

    it('stageTransportIndeterminate shows a reload warning, publishes no rows', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      mockRunFinalize.mockResolvedValue({kind: 'stageTransportIndeterminate'});

      await act(async () => {
        await result.current.submitReview(['a'], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload'),
        'warning',
      );
      expect(store.getState().validationResults).toHaveLength(0);
      expect(store.getState().mode).toBe('edit');
    });

    it('commitRejected shows a danger toast and publishes mapped rows', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      const outcome: FinalizeOutcome = {
        kind: 'commitRejected',
        message: 'rejected',
      };
      mockRunFinalize.mockResolvedValue(outcome);

      await act(async () => {
        await result.current.submitReview([], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('rejected'),
        'danger',
      );
      expect(store.getState().validationResults.length).toBeGreaterThan(0);
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(store.getState().mode).toBe('edit');
    });

    it('commitPartial shows a warning toast and publishes mapped rows', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      const outcome: FinalizeOutcome = {
        failedChangeIds: ['b'],
        kind: 'commitPartial',
        message: 'partial',
        processedChangeIds: ['a'],
      };
      mockRunFinalize.mockResolvedValue(outcome);

      await act(async () => {
        await result.current.submitReview(['a', 'b'], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Partial'),
        'warning',
      );
      expect(store.getState().validationResults.length).toBeGreaterThan(0);
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(store.getState().mode).toBe('edit');
    });

    it('commitTransportIndeterminate shows a reload warning, publishes no rows', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      mockRunFinalize.mockResolvedValue({kind: 'commitTransportIndeterminate'});

      await act(async () => {
        await result.current.submitReview([], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload'),
        'warning',
      );
      expect(store.getState().validationResults).toHaveLength(0);
      expect(store.getState().mode).toBe('edit');
    });

    it('endSessionDeterminate shows a danger toast and publishes mapped rows', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      const outcome: FinalizeOutcome = {
        code: '422',
        kind: 'endSessionDeterminate',
        message: 'staged changes exist',
      };
      mockRunFinalize.mockResolvedValue(outcome);

      await act(async () => {
        await result.current.submitReview([], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('End session failed'),
        'danger',
      );
      expect(store.getState().validationResults).toEqual([
        expect.objectContaining({
          errorCode: 'end-session-staged-changes-exist',
        }),
      ]);
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(store.getState().mode).toBe('edit');
    });

    it('endSessionPostCommitReloadNeeded reloads before marking clean and exiting edit', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      mockRunFinalize.mockResolvedValue({
        kind: 'endSessionPostCommitReloadNeeded',
      });
      const callOrder: string[] = [];
      const loadGraphDataSpy = jest
        .spyOn(store.getState(), 'loadGraphData')
        .mockImplementation(() => {
          callOrder.push('loadGraphData');
          return Promise.resolve();
        });
      const markCleanSpy = jest
        .spyOn(store.getState(), 'markClean')
        .mockImplementation(() => {
          callOrder.push('markClean');
        });

      await act(async () => {
        await result.current.submitReview([], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload to reconcile'),
        'warning',
      );
      expect(callOrder).toEqual(['loadGraphData', 'markClean']);
      expect(store.getState().mode).toBe('view');
      loadGraphDataSpy.mockRestore();
      markCleanSpy.mockRestore();
    });

    it('endSessionPostCommitReloadNeeded keeps the session dirty and in edit mode when the reload fails', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      mockRunFinalize.mockResolvedValue({
        kind: 'endSessionPostCommitReloadNeeded',
      });
      mockFailedReload();

      await act(async () => {
        await result.current.submitReview([], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload failed'),
        'warning',
      );
      expect(store.getState().mode).toBe('edit');
      expect(store.getState().isDirty).toBe(true);
    });

    it('endSessionTransportIndeterminate shows a reload warning, no mode change', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      mockRunFinalize.mockResolvedValue({
        kind: 'endSessionTransportIndeterminate',
      });

      await act(async () => {
        await result.current.submitReview([], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload'),
        'warning',
      );
      expect(store.getState().mode).toBe('edit');
    });

    it('committed reloads before mark-clean/exit-edit and shows a success toast', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      mockRunFinalize.mockResolvedValue({
        kind: 'committed',
        sessionMode: 'READONLY',
        summary: 'done',
      });
      const callOrder: string[] = [];
      const loadGraphDataSpy = jest
        .spyOn(store.getState(), 'loadGraphData')
        .mockImplementation(() => {
          callOrder.push('loadGraphData');
          return Promise.resolve();
        });
      const markCleanSpy = jest
        .spyOn(store.getState(), 'markClean')
        .mockImplementation(() => {
          callOrder.push('markClean');
        });

      await act(async () => {
        await result.current.submitReview([], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('applied'),
        'success',
      );
      expect(callOrder).toEqual(['loadGraphData', 'markClean']);
      expect(store.getState().mode).toBe('view');
      loadGraphDataSpy.mockRestore();
      markCleanSpy.mockRestore();
    });

    it('committed keeps the session dirty and in edit mode when the reload fails', async () => {
      const store = makeStore();
      const {result} = await openReview(store);
      mockRunFinalize.mockResolvedValue({
        kind: 'committed',
        sessionMode: 'READONLY',
        summary: 'done',
      });
      mockFailedReload();

      await act(async () => {
        await result.current.submitReview([], 'keep');
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload failed'),
        'warning',
      );
      expect(store.getState().mode).toBe('edit');
      expect(store.getState().isDirty).toBe(true);
      expect(store.getState().graphDataStatus).toBe('error');
    });

    it('nav choice add reloads selectedUsecases plus createdSystemIds, deduplicated', async () => {
      const store = makeStore();
      const response = makeReviewResponse();
      const {result} = await openReview(store, response);
      mockRunFinalize.mockResolvedValue({
        kind: 'committed',
        sessionMode: 'READONLY',
        summary: 'done',
      });
      const loadGraphDataSpy = jest.spyOn(store.getState(), 'loadGraphData');

      await act(async () => {
        await result.current.submitReview(['change-1'], 'add');
      });

      expect(loadGraphDataSpy).toHaveBeenCalledWith([
        'uc-existing',
        'uc-new-1',
      ]);
      loadGraphDataSpy.mockRestore();
    });

    it('nav choice switch reloads only createdSystemIds', async () => {
      const store = makeStore();
      const response = makeReviewResponse();
      const {result} = await openReview(store, response);
      mockRunFinalize.mockResolvedValue({
        kind: 'committed',
        sessionMode: 'READONLY',
        summary: 'done',
      });
      const loadGraphDataSpy = jest.spyOn(store.getState(), 'loadGraphData');

      await act(async () => {
        await result.current.submitReview(['change-1'], 'switch');
      });

      expect(loadGraphDataSpy).toHaveBeenCalledWith(['uc-new-1']);
      loadGraphDataSpy.mockRestore();
    });

    it('nav choice switch reloads no created usecases once the created row is unchecked', async () => {
      const store = makeStore();
      const response = makeReviewResponse();
      const {result} = await openReview(store, response);
      mockRunFinalize.mockResolvedValue({
        kind: 'committed',
        sessionMode: 'READONLY',
        summary: 'done',
      });
      const loadGraphDataSpy = jest.spyOn(store.getState(), 'loadGraphData');

      await act(async () => {
        await result.current.submitReview([], 'switch');
      });

      expect(loadGraphDataSpy).toHaveBeenCalledWith([]);
      loadGraphDataSpy.mockRestore();
    });
  });

  describe('discard — outcomes', () => {
    it('discarded reloads before mark-clean/exit-edit and shows a success toast', async () => {
      const store = makeStore();
      store.getState().markDirty();
      const outcome: DiscardOutcome = {
        cascadedChangeIds: [],
        kind: 'discarded',
      };
      mockRunDiscard.mockResolvedValue(outcome);
      const callOrder: string[] = [];
      const loadGraphDataSpy = jest
        .spyOn(store.getState(), 'loadGraphData')
        .mockImplementation(() => {
          callOrder.push('loadGraphData');
          return Promise.resolve();
        });
      const markCleanSpy = jest
        .spyOn(store.getState(), 'markClean')
        .mockImplementation(() => {
          callOrder.push('markClean');
        });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.discard();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('discarded'),
        'success',
      );
      expect(callOrder).toEqual(['loadGraphData', 'markClean']);
      expect(store.getState().mode).toBe('view');
      loadGraphDataSpy.mockRestore();
      markCleanSpy.mockRestore();
    });

    it('discarded keeps the session dirty and in edit mode when the reload fails', async () => {
      const store = makeStore();
      store.getState().markDirty();
      const outcome: DiscardOutcome = {
        cascadedChangeIds: [],
        kind: 'discarded',
      };
      mockRunDiscard.mockResolvedValue(outcome);
      mockFailedReload();
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.discard();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload failed'),
        'warning',
      );
      expect(store.getState().mode).toBe('edit');
      expect(store.getState().isDirty).toBe(true);
      expect(store.getState().graphDataStatus).toBe('error');
    });

    it('discardDeterminate shows a danger toast and publishes mapped rows', async () => {
      const store = makeStore();
      const outcome: DiscardOutcome = {
        failedChangeIds: ['a'],
        kind: 'discardDeterminate',
        message: 'failed',
      };
      mockRunDiscard.mockResolvedValue(outcome);
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.discard();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Discard failed'),
        'danger',
      );
      expect(store.getState().validationResults.length).toBeGreaterThan(0);
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(store.getState().mode).toBe('edit');
    });

    it('discardChangesTransportIndeterminate shows a reload warning, publishes no rows', async () => {
      const store = makeStore();
      mockRunDiscard.mockResolvedValue({
        kind: 'discardChangesTransportIndeterminate',
      });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.discard();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload'),
        'warning',
      );
      expect(store.getState().validationResults).toHaveLength(0);
      expect(store.getState().mode).toBe('edit');
    });

    it('endSessionDeterminate shows a danger toast and publishes mapped rows', async () => {
      const store = makeStore();
      const outcome: DiscardOutcome = {
        code: '400',
        kind: 'endSessionDeterminate',
        message: 'no active session',
      };
      mockRunDiscard.mockResolvedValue(outcome);
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.discard();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('End session failed'),
        'danger',
      );
      expect(store.getState().validationResults).toEqual([
        expect.objectContaining({
          errorCode: 'end-session-no-active-session',
        }),
      ]);
      expect(mockFocusTab).toHaveBeenCalledWith('validation-results');
      expect(store.getState().mode).toBe('edit');
    });

    it('endSessionPostDiscardReloadNeeded reloads before mark-clean/exit-edit', async () => {
      const store = makeStore();
      mockRunDiscard.mockResolvedValue({
        kind: 'endSessionPostDiscardReloadNeeded',
      });
      const callOrder: string[] = [];
      const loadGraphDataSpy = jest
        .spyOn(store.getState(), 'loadGraphData')
        .mockImplementation(() => {
          callOrder.push('loadGraphData');
          return Promise.resolve();
        });
      const markCleanSpy = jest
        .spyOn(store.getState(), 'markClean')
        .mockImplementation(() => {
          callOrder.push('markClean');
        });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.discard();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload to reconcile'),
        'warning',
      );
      expect(callOrder).toEqual(['loadGraphData', 'markClean']);
      expect(store.getState().mode).toBe('view');
      loadGraphDataSpy.mockRestore();
      markCleanSpy.mockRestore();
    });

    it('endSessionPostDiscardReloadNeeded keeps the session in edit mode when the reload fails', async () => {
      const store = makeStore();
      mockRunDiscard.mockResolvedValue({
        kind: 'endSessionPostDiscardReloadNeeded',
      });
      mockFailedReload();
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.discard();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload failed'),
        'warning',
      );
      expect(store.getState().mode).toBe('edit');
    });

    it('discardTransportIndeterminate shows a reload warning, no mode change', async () => {
      const store = makeStore();
      mockRunDiscard.mockResolvedValue({kind: 'discardTransportIndeterminate'});
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.discard();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Reload'),
        'warning',
      );
      expect(store.getState().mode).toBe('edit');
    });
  });

  describe('validation rows carried across repeated attempts', () => {
    it('clears stale rows from a prior blocked attempt even when the next attempt publishes none', async () => {
      const store = makeStore();
      store.getState().markDirty();
      const fatalIssue = makeIssue({message: 'Fatal', severity: 'FATAL'});
      mockRunApplyReconcile.mockResolvedValueOnce({
        issues: [fatalIssue],
        kind: 'blocked',
      });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.apply();
      });

      expect(store.getState().validationResults).toHaveLength(1);

      mockRunApplyReconcile.mockResolvedValueOnce({
        kind: 'emptyReconcile',
        notices: [],
      });
      mockRunFinalize.mockResolvedValueOnce({
        kind: 'committed',
        sessionMode: 'READONLY',
        summary: 'done',
      });

      await act(async () => {
        await result.current.apply();
      });

      expect(store.getState().validationResults).toEqual([]);
    });
  });

  describe('mutation lock, cancelReview, and isDirty gating', () => {
    it('a second apply() while one is in flight is a no-op — no additional coordinator call', async () => {
      const store = makeStore();
      store.getState().markDirty();
      let resolveReconcile!: (outcome: ReconcileOutcome) => void;
      mockRunApplyReconcile.mockReturnValue(
        new Promise((resolve) => {
          resolveReconcile = resolve;
        }),
      );
      const {result} = renderApplyDiscard(store);

      let firstCall!: Promise<void>;
      act(() => {
        firstCall = result.current.apply();
      });

      await act(async () => {
        await result.current.apply();
      });

      expect(mockRunApplyReconcile).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveReconcile({kind: 'finalizeDirectly'});
        mockRunFinalize.mockResolvedValue({
          kind: 'committed',
          sessionMode: 'READONLY',
          summary: 'done',
        });
        await firstCall;
      });
    });

    it('cancelReview closes pendingReview without any coordinator or API call', async () => {
      const store = makeStore();
      store.getState().markDirty();
      mockRunApplyReconcile.mockResolvedValue({
        kind: 'review',
        notices: [],
        response: makeReviewResponse(),
      });
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.apply();
      });

      expect(result.current.pendingReview).not.toBeNull();

      act(() => {
        result.current.cancelReview();
      });

      expect(result.current.pendingReview).toBeNull();
      expect(mockRunFinalize).not.toHaveBeenCalled();
      expect(mockRunApplyReconcile).toHaveBeenCalledTimes(1);
    });

    it('apply() is a no-op when the session is not dirty', async () => {
      const store = makeStore();
      const {result} = renderApplyDiscard(store);

      await act(async () => {
        await result.current.apply();
      });

      expect(mockRunApplyReconcile).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });
});
