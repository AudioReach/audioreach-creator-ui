/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useRef, useState} from 'react';

import {
  commitChanges,
  createUsecases,
  type CreateUsecasesResponseDto,
  discardChanges,
  endSession,
  stageChanges,
} from '~entities/edit-session';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';
import {tabFocusRegistry, VALIDATION_RESULTS_TAB_NODE_ID} from '~shared/store';
import type {ValidationResult} from '~shared/store/tab-store-slices/validation-result-slice';

import {buildCreateUsecasesRequest} from '../lib/build-create-usecases-request';
import {mapFinalizeErrorToValidationResults} from '../lib/map-finalize-error-to-validation-results';
import {mapIssueToValidationResult} from '../lib/map-issue-to-validation-result';
import {
  runApplyReconcile,
  runDiscard,
  runFinalize,
} from '../model/apply-discard-coordinator';
import type {ReconcileOutcome} from '../model/apply-discard.types';
import {withMutationLock} from '../model/edit-session-slice';
import {
  type GraphDesignerStoreApi,
  useGraphDesignerStore,
} from '../model/graph-designer-store-context';

export interface UseApplyDiscardArgs {
  projectId: string;
  routingTriggered: boolean;
}

type NavChoice = 'add' | 'keep' | 'switch';

export interface UseApplyDiscardReturn {
  apply: () => Promise<void>;
  cancelReview: () => void;
  discard: () => Promise<void>;
  isBusy: boolean;
  pendingReview: {response: CreateUsecasesResponseDto} | null;
  submitReview: (
    checkedChangeIds: string[],
    navChoice: NavChoice,
  ) => Promise<void>;
}

type TerminalStatus = 'aborted' | 'error' | 'success';

function computeReloadUsecases(
  navChoice: NavChoice,
  createdSystemIds: string[],
  selectedUsecases: string[],
): string[] {
  if (navChoice === 'switch') {
    return createdSystemIds;
  }
  if (navChoice === 'add') {
    const merged = [...selectedUsecases, ...createdSystemIds];
    return merged.filter((id, index) => merged.indexOf(id) === index);
  }
  return selectedUsecases;
}

function withCallLog<A extends unknown[], R>(
  action: string,
  projectId: string,
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    logger.debug(`useApplyDiscard: ${action}`, {
      action,
      component: 'useApplyDiscard',
      projectId,
    });
    return fn(...args);
  };
}

function logTerminal(
  action: 'apply_changes' | 'discard_changes' | 'submit_review',
  outcomeKind: string,
  projectId: string,
  status: TerminalStatus,
): void {
  const context = {
    action: `${action}_${status}`,
    component: 'useApplyDiscard',
    outcomeKind,
    projectId,
  };
  if (status === 'error') {
    logger.error(`useApplyDiscard: ${action} outcome ${outcomeKind}`, context);
  } else if (status === 'aborted') {
    logger.warn(`useApplyDiscard: ${action} outcome ${outcomeKind}`, context);
  } else {
    logger.info(`useApplyDiscard: ${action} outcome ${outcomeKind}`, context);
  }
}

function publishRows(
  store: GraphDesignerStoreApi,
  rows: Omit<ValidationResult, 'id'>[],
): void {
  const {addValidationResult, clearValidationResults} = store.getState();
  clearValidationResults();
  if (rows.length === 0) {
    return;
  }
  for (const row of rows) {
    addValidationResult(row);
  }
  tabFocusRegistry.focusTab(VALIDATION_RESULTS_TAB_NODE_ID);
}

async function settleAfterReload(
  store: GraphDesignerStoreApi,
  reload: () => Promise<void>,
  action: 'apply_changes' | 'discard_changes' | 'submit_review',
  outcomeKind: string,
  projectId: string,
  successToast: {message: string; variant: 'success' | 'warning'},
  successStatus: TerminalStatus,
): Promise<void> {
  await reload();
  if (store.getState().graphDataStatus === 'error') {
    showToast('Reload failed — try again', 'warning');
    logTerminal(action, outcomeKind, projectId, 'error');
    return;
  }
  showToast(successToast.message, successToast.variant);
  store.getState().markClean();
  store.getState().exitEditMode();
  logTerminal(action, outcomeKind, projectId, successStatus);
}

async function finalize(
  store: GraphDesignerStoreApi,
  projectId: string,
  checkedChangeIds: string[],
  navChoice: NavChoice,
  createdSystemIds: string[],
  actionLabel: 'apply_changes' | 'submit_review',
): Promise<void> {
  const outcome = await runFinalize(
    {
      commitChanges: withCallLog('commit_changes', projectId, commitChanges),
      endSession: withCallLog('end_session', projectId, endSession),
      stageChanges: withCallLog('stage_changes', projectId, stageChanges),
    },
    {
      checkedChangeIds,
      processedFromPrevAttempt: store.getState().stagedProcessedChangeIds,
      projectId,
    },
  );

  const reload = async (): Promise<void> => {
    await store
      .getState()
      .loadGraphData(
        computeReloadUsecases(
          navChoice,
          createdSystemIds,
          store.getState().selectedUsecases,
        ),
      );
  };

  switch (outcome.kind) {
    case 'stageFailed': {
      showToast('Stage failed', 'danger');
      publishRows(store, mapFinalizeErrorToValidationResults(outcome));
      store.getState().recordStageProcessed(outcome.processedChangeIds);
      logTerminal(actionLabel, outcome.kind, projectId, 'error');
      return;
    }
    case 'stageTransportIndeterminate': {
      showToast('Reload to observe actual state', 'warning');
      logTerminal(actionLabel, outcome.kind, projectId, 'aborted');
      return;
    }
    case 'commitRejected': {
      showToast('Commit rejected', 'danger');
      publishRows(store, mapFinalizeErrorToValidationResults(outcome));
      logTerminal(actionLabel, outcome.kind, projectId, 'error');
      return;
    }
    case 'commitPartial': {
      showToast('Partial commit — reload to reconcile', 'warning');
      publishRows(store, mapFinalizeErrorToValidationResults(outcome));
      logTerminal(actionLabel, outcome.kind, projectId, 'aborted');
      return;
    }
    case 'commitTransportIndeterminate': {
      showToast('Reload to observe actual state', 'warning');
      logTerminal(actionLabel, outcome.kind, projectId, 'aborted');
      return;
    }
    case 'endSessionDeterminate': {
      showToast('End session failed', 'danger');
      publishRows(store, mapFinalizeErrorToValidationResults(outcome));
      logTerminal(actionLabel, outcome.kind, projectId, 'error');
      return;
    }
    case 'endSessionPostCommitReloadNeeded': {
      await settleAfterReload(
        store,
        reload,
        actionLabel,
        outcome.kind,
        projectId,
        {message: 'Reload to reconcile', variant: 'warning'},
        'aborted',
      );
      return;
    }
    case 'endSessionTransportIndeterminate': {
      showToast('Reload to observe actual state', 'warning');
      logTerminal(actionLabel, outcome.kind, projectId, 'aborted');
      return;
    }
    case 'committed': {
      await settleAfterReload(
        store,
        reload,
        actionLabel,
        outcome.kind,
        projectId,
        {message: 'Changes applied', variant: 'success'},
        'success',
      );
      return;
    }
  }
}

async function performDiscard(
  store: GraphDesignerStoreApi,
  projectId: string,
): Promise<void> {
  const outcome = await runDiscard(
    {
      discardChanges: withCallLog('discard_changes', projectId, discardChanges),
      endSession: withCallLog('end_session', projectId, endSession),
    },
    {projectId},
  );

  const reload = async (): Promise<void> => {
    await store.getState().loadGraphData(store.getState().selectedUsecases);
  };

  switch (outcome.kind) {
    case 'discarded': {
      await settleAfterReload(
        store,
        reload,
        'discard_changes',
        outcome.kind,
        projectId,
        {message: 'Changes discarded', variant: 'success'},
        'success',
      );
      return;
    }
    case 'discardDeterminate': {
      showToast('Discard failed', 'danger');
      publishRows(store, mapFinalizeErrorToValidationResults(outcome));
      logTerminal('discard_changes', outcome.kind, projectId, 'error');
      return;
    }
    case 'discardChangesTransportIndeterminate': {
      showToast('Reload to observe actual state', 'warning');
      logTerminal('discard_changes', outcome.kind, projectId, 'aborted');
      return;
    }
    case 'endSessionDeterminate': {
      showToast('End session failed', 'danger');
      publishRows(store, mapFinalizeErrorToValidationResults(outcome));
      logTerminal('discard_changes', outcome.kind, projectId, 'error');
      return;
    }
    case 'endSessionPostDiscardReloadNeeded': {
      await settleAfterReload(
        store,
        reload,
        'discard_changes',
        outcome.kind,
        projectId,
        {message: 'Reload to reconcile', variant: 'warning'},
        'aborted',
      );
      return;
    }
    case 'discardTransportIndeterminate': {
      showToast('Reload to observe actual state', 'warning');
      logTerminal('discard_changes', outcome.kind, projectId, 'aborted');
      return;
    }
  }
}

export function useApplyDiscard(
  args: UseApplyDiscardArgs,
): UseApplyDiscardReturn {
  const {projectId, routingTriggered} = args;
  const store = useGraphDesignerStore();
  const [isBusy, setIsBusy] = useState(false);
  const [pendingReview, setPendingReview] = useState<{
    response: CreateUsecasesResponseDto;
  } | null>(null);
  const pendingReviewResponseRef = useRef<CreateUsecasesResponseDto | null>(
    null,
  );

  const handleReconcileOutcome = useCallback(
    async (outcome: ReconcileOutcome): Promise<void> => {
      switch (outcome.kind) {
        case 'finalizeDirectly': {
          await finalize(store, projectId, [], 'keep', [], 'apply_changes');
          return;
        }
        case 'blocked': {
          showToast('Apply blocked', 'danger');
          publishRows(store, outcome.issues.map(mapIssueToValidationResult));
          logTerminal('apply_changes', outcome.kind, projectId, 'error');
          return;
        }
        case 'emptyReconcile': {
          publishRows(store, outcome.notices.map(mapIssueToValidationResult));
          await finalize(store, projectId, [], 'keep', [], 'apply_changes');
          return;
        }
        case 'reconcileTransportIndeterminate': {
          showToast('Reload to observe actual state', 'warning');
          logTerminal('apply_changes', outcome.kind, projectId, 'aborted');
          return;
        }
        case 'reconcileFailed': {
          showToast('Apply failed', 'danger');
          publishRows(store, mapFinalizeErrorToValidationResults(outcome));
          logTerminal('apply_changes', outcome.kind, projectId, 'error');
          return;
        }
        case 'review': {
          publishRows(store, outcome.notices.map(mapIssueToValidationResult));
          pendingReviewResponseRef.current = outcome.response;
          setPendingReview({response: outcome.response});
          logTerminal('apply_changes', outcome.kind, projectId, 'aborted');
          return;
        }
      }
    },
    [store, projectId],
  );

  const apply = useCallback(async () => {
    if (!store.getState().isDirty) {
      return;
    }
    setIsBusy(true);
    try {
      await withMutationLock(store.getState, async () => {
        const state = store.getState();
        const request = buildCreateUsecasesRequest({
          excludedLinks: state.excludedLinks,
          kvSelectionsById: state.kvSelectionsById,
          selectedUsecaseSystemIds: state.selectedUsecases,
        });
        const outcome = await runApplyReconcile(
          {
            createUsecases: withCallLog(
              'create_usecases',
              projectId,
              createUsecases,
            ),
          },
          {projectId, request, routingTriggered},
        );
        await handleReconcileOutcome(outcome);
      });
    } catch (error) {
      logger.debug('useApplyDiscard: apply_changes aborted', {
        action: 'apply_changes_aborted',
        component: 'useApplyDiscard',
        error: error instanceof Error ? error.message : String(error),
        projectId,
      });
    } finally {
      if (!store.getState().isMutating) {
        setIsBusy(false);
      }
    }
  }, [store, projectId, routingTriggered, handleReconcileOutcome]);

  const submitReview = useCallback(
    async (checkedChangeIds: string[], navChoice: NavChoice) => {
      const response = pendingReviewResponseRef.current;
      if (!response) {
        return;
      }
      const createdSystemIds = response.created.map((r) => r.systemId);
      setPendingReview(null);
      pendingReviewResponseRef.current = null;
      setIsBusy(true);
      try {
        await withMutationLock(store.getState, () =>
          finalize(
            store,
            projectId,
            checkedChangeIds,
            navChoice,
            createdSystemIds,
            'submit_review',
          ),
        );
      } catch (error) {
        logger.debug('useApplyDiscard: submit_review aborted', {
          action: 'submit_review_aborted',
          component: 'useApplyDiscard',
          error: error instanceof Error ? error.message : String(error),
          projectId,
        });
      } finally {
        if (!store.getState().isMutating) {
          setIsBusy(false);
        }
      }
    },
    [store, projectId],
  );

  const cancelReview = useCallback(() => {
    setPendingReview(null);
    pendingReviewResponseRef.current = null;
  }, []);

  const discard = useCallback(async () => {
    setIsBusy(true);
    try {
      await withMutationLock(store.getState, () =>
        performDiscard(store, projectId),
      );
    } catch (error) {
      logger.debug('useApplyDiscard: discard_changes aborted', {
        action: 'discard_changes_aborted',
        component: 'useApplyDiscard',
        error: error instanceof Error ? error.message : String(error),
        projectId,
      });
    } finally {
      if (!store.getState().isMutating) {
        setIsBusy(false);
      }
    }
  }, [store, projectId]);

  return {apply, cancelReview, discard, isBusy, pendingReview, submitReview};
}
