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
  stageUsecases,
} from '~entities/edit-session';
import {formatUsecaseName} from '~entities/usecases';
import {useUserPreferences} from '~shared/config/hooks';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';

import {buildCreateUsecasesRequest} from '../lib/build-create-usecases-request';
import {isSubsystemScopedFilter} from '../lib/is-subsystem-scoped-filter';
import {mapFinalizeErrorToValidationResults} from '../lib/map-finalize-error-to-validation-results';
import {mapIssueToValidationResult} from '../lib/map-issue-to-validation-result';
import {publishValidationResults} from '../lib/publish-validation-results';
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
  onApplyUsecaseChanges?: (args: ApplyUsecaseChangesArgs) => Promise<string[]>;
  projectId: string;
  routingTriggered: boolean;
  selectedUsecaseSystemIds: string[];
}

export interface ApplyUsecaseChangesArgs {
  createdSystemIds: string[];
  createdUsecases: CreatedUsecaseSelection[];
  currentSystemIds: string[];
  deletedSystemIds: string[];
  navChoice: NavChoice;
  updatedSystemIds: string[];
}

export interface CreatedUsecaseSelection {
  displayName: string;
  systemId: string;
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

export function computeReloadUsecases(
  navChoice: NavChoice,
  createdSystemIds: string[],
  deletedSystemIds: string[],
  selectedUsecaseSystemIds: string[],
  updatedSystemIds: string[] = [],
): string[] {
  if (navChoice === 'switch' && createdSystemIds.length > 0) {
    return createdSystemIds;
  }
  const deletedIds = new Set(deletedSystemIds);
  const retainedUsecases = [
    ...selectedUsecaseSystemIds,
    ...updatedSystemIds,
  ].filter((id) => !deletedIds.has(id));
  if (navChoice === 'add') {
    const merged = [...retainedUsecases, ...createdSystemIds];
    return merged.filter((id, index) => merged.indexOf(id) === index);
  }
  return retainedUsecases;
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
  const exited = await store.getState().exitEditMode();
  if (!exited) {
    showToast("Couldn't exit edit mode", 'danger');
  }
  logTerminal(action, outcomeKind, projectId, successStatus);
}

async function finalize(
  store: GraphDesignerStoreApi,
  projectId: string,
  currentSystemIds: string[],
  stageSystemIds: string[],
  navChoice: NavChoice,
  createdUsecases: CreatedUsecaseSelection[],
  createdSystemIds: string[],
  deletedSystemIds: string[],
  updatedSystemIds: string[],
  actionLabel: 'apply_changes' | 'submit_review',
  filterComponentsBySubsystem: boolean,
  onApplyUsecaseChanges: UseApplyDiscardArgs['onApplyUsecaseChanges'],
): Promise<void> {
  const outcome = await runFinalize(
    {
      commitChanges: withCallLog('commit_changes', projectId, commitChanges),
      endSession: withCallLog('end_session', projectId, endSession),
      stageUsecases: withCallLog('stage_usecases', projectId, stageUsecases),
    },
    {
      processedFromPrevAttempt: store.getState().stagedProcessedChangeIds,
      projectId,
      stageSystemIds,
    },
  );

  const reload = async (): Promise<void> => {
    const reloadUsecases = onApplyUsecaseChanges
      ? await onApplyUsecaseChanges({
          createdSystemIds,
          createdUsecases,
          currentSystemIds,
          deletedSystemIds,
          navChoice,
          updatedSystemIds,
        })
      : computeReloadUsecases(
          navChoice,
          createdSystemIds,
          deletedSystemIds,
          currentSystemIds,
          updatedSystemIds,
        );

    await store
      .getState()
      .loadGraphData(reloadUsecases, {
        filterBySubsystem: filterComponentsBySubsystem,
      });
  };

  switch (outcome.kind) {
    case 'stageFailed': {
      showToast('Stage failed', 'danger');
      publishValidationResults(
        store,
        mapFinalizeErrorToValidationResults(outcome),
      );
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
      publishValidationResults(
        store,
        mapFinalizeErrorToValidationResults(outcome),
      );
      logTerminal(actionLabel, outcome.kind, projectId, 'error');
      return;
    }
    case 'commitPartial': {
      showToast('Partial commit — reload to reconcile', 'warning');
      publishValidationResults(
        store,
        mapFinalizeErrorToValidationResults(outcome),
      );
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
      publishValidationResults(
        store,
        mapFinalizeErrorToValidationResults(outcome),
      );
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
  filterComponentsBySubsystem: boolean,
): Promise<void> {
  const outcome = await runDiscard(
    {
      discardChanges: withCallLog('discard_changes', projectId, discardChanges),
      endSession: withCallLog('end_session', projectId, endSession),
    },
    {projectId},
  );

  const reload = async (): Promise<void> => {
    await store
      .getState()
      .loadGraphData(store.getState().graphData?.selectedUsecases ?? [], {
        filterBySubsystem: filterComponentsBySubsystem,
      });
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
      publishValidationResults(
        store,
        mapFinalizeErrorToValidationResults(outcome),
      );
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
      publishValidationResults(
        store,
        mapFinalizeErrorToValidationResults(outcome),
      );
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
  const {
    onApplyUsecaseChanges,
    projectId,
    routingTriggered,
    selectedUsecaseSystemIds,
  } = args;
  const store = useGraphDesignerStore();
  const {preferences} = useUserPreferences();
  const namePreference = preferences.usecases.namePreference;
  const filterComponentsBySubsystem = isSubsystemScopedFilter(
    preferences.usecases,
  );
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
          await finalize(
            store,
            projectId,
            selectedUsecaseSystemIds,
            [],
            'keep',
            [],
            [],
            [],
            [],
            'apply_changes',
            filterComponentsBySubsystem,
            onApplyUsecaseChanges,
          );
          return;
        }
        case 'blocked': {
          showToast('Apply blocked', 'danger');
          publishValidationResults(
            store,
            outcome.issues.map(mapIssueToValidationResult),
          );
          logTerminal('apply_changes', outcome.kind, projectId, 'error');
          return;
        }
        case 'emptyReconcile': {
          publishValidationResults(
            store,
            outcome.notices.map(mapIssueToValidationResult),
          );
          await finalize(
            store,
            projectId,
            selectedUsecaseSystemIds,
            [],
            'keep',
            [],
            [],
            [],
            [],
            'apply_changes',
            filterComponentsBySubsystem,
            onApplyUsecaseChanges,
          );
          return;
        }
        case 'reconcileTransportIndeterminate': {
          showToast('Reload to observe actual state', 'warning');
          logTerminal('apply_changes', outcome.kind, projectId, 'aborted');
          return;
        }
        case 'reconcileFailed': {
          showToast('Apply failed', 'danger');
          publishValidationResults(
            store,
            mapFinalizeErrorToValidationResults(outcome),
          );
          logTerminal('apply_changes', outcome.kind, projectId, 'error');
          return;
        }
        case 'review': {
          publishValidationResults(
            store,
            outcome.notices.map(mapIssueToValidationResult),
          );
          pendingReviewResponseRef.current = outcome.response;
          setPendingReview({response: outcome.response});
          logTerminal('apply_changes', outcome.kind, projectId, 'aborted');
          return;
        }
      }
    },
    [
      store,
      projectId,
      filterComponentsBySubsystem,
      selectedUsecaseSystemIds,
      onApplyUsecaseChanges,
    ],
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
          allLinks: state.graphData?.connections ?? [],
          excludedLinks: state.excludedLinks,
          kvSelectionsById: state.kvSelectionsById,
          usecaseSystemIds: selectedUsecaseSystemIds,
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
  }, [
    store,
    projectId,
    routingTriggered,
    selectedUsecaseSystemIds,
    handleReconcileOutcome,
  ]);

  const submitReview = useCallback(
    async (checkedChangeIds: string[], navChoice: NavChoice) => {
      const response = pendingReviewResponseRef.current;
      if (!response) {
        return;
      }
      const checkedChanges = response.changes.filter((change) =>
        checkedChangeIds.includes(change.changeId),
      );
      const createdSystemIds = checkedChanges
        .filter((change) => change.operation === 'CREATE')
        .map((change) => change.systemId);
      const createdUsecases = checkedChanges.flatMap((change) =>
        change.operation === 'CREATE' && change.after
          ? [
              {
                displayName: formatUsecaseName(
                  {
                    alias: change.after.alias,
                    keyValuePairs: change.after.gkv,
                  },
                  namePreference,
                ),
                systemId: change.systemId,
              },
            ]
          : [],
      );
      const deletedSystemIds = checkedChanges
        .filter((change) => change.operation === 'DELETE')
        .map((change) => change.systemId);
      const updatedSystemIds = checkedChanges
        .filter((change) => change.operation === 'UPDATE')
        .map((change) => change.systemId);
      // UPDATE changes are already staged server-side.
      // only usecase additions/deletions need an explicit stage call here.
      const stageSystemIds = checkedChanges
        .filter(
          (change) =>
            change.operation === 'CREATE' || change.operation === 'DELETE',
        )
        .map((change) => change.systemId);
      setPendingReview(null);
      pendingReviewResponseRef.current = null;
      setIsBusy(true);
      try {
        await withMutationLock(store.getState, () =>
          finalize(
            store,
            projectId,
            selectedUsecaseSystemIds,
            stageSystemIds,
            navChoice,
            createdUsecases,
            createdSystemIds,
            deletedSystemIds,
            updatedSystemIds,
            'submit_review',
            filterComponentsBySubsystem,
            onApplyUsecaseChanges,
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
    [
      store,
      projectId,
      selectedUsecaseSystemIds,
      filterComponentsBySubsystem,
      onApplyUsecaseChanges,
      namePreference,
    ],
  );

  const cancelReview = useCallback(() => {
    setPendingReview(null);
    pendingReviewResponseRef.current = null;
  }, []);

  const discard = useCallback(async () => {
    setIsBusy(true);
    try {
      await withMutationLock(store.getState, () =>
        performDiscard(store, projectId, filterComponentsBySubsystem),
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
  }, [store, projectId, filterComponentsBySubsystem]);

  return {apply, cancelReview, discard, isBusy, pendingReview, submitReview};
}
