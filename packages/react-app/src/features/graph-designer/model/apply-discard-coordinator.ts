/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  commitChanges,
  createUsecases,
  CreateUsecasesRequestDto,
  discardChanges,
  endSession,
  stageChanges,
} from '~entities/edit-session';
import {
  getIssueMessage,
  hasBlockingIssues,
  isTransportFailure,
  type ApiResult,
} from '~shared/api';

import {partitionIssues} from '../lib/issue-gate';

import type {
  DiscardOutcome,
  FinalizeOutcome,
  ReconcileOutcome,
} from './apply-discard.types';

function getTransportHttpStatus(result: ApiResult<unknown>): number | undefined {
  const issueCode = result.issues?.find((issue) =>
    issue.code.startsWith('TRANSPORT_HTTP_'),
  )?.code;
  const match = issueCode ? /TRANSPORT_HTTP_(\d{3})/.exec(issueCode) : null;
  return match ? Number(match[1]) : undefined;
}

export interface ReconcileDeps {
  createUsecases: typeof createUsecases;
}

export interface ReconcileArgs {
  projectId: string;
  request: CreateUsecasesRequestDto;
  routingTriggered: boolean;
}

export async function runApplyReconcile(
  deps: ReconcileDeps,
  args: ReconcileArgs,
): Promise<ReconcileOutcome> {
  if (!args.routingTriggered) {
    return {kind: 'finalizeDirectly'};
  }

  const result = await deps.createUsecases(args.projectId, args.request);

  if (isTransportFailure(result) && !result.data) {
    return {kind: 'reconcileTransportIndeterminate'};
  }

  if (!result.data && hasBlockingIssues(result)) {
    return {
      kind: 'reconcileFailed',
      message: getIssueMessage(result, 'Failed to reconcile staged changes'),
    };
  }

  const response = result.data;
  const issues = response?.issues ?? [];
  const {blocking, notices} = partitionIssues(issues);

  if (blocking.length > 0) {
    return {issues, kind: 'blocked'};
  }

  if (!response) {
    return {kind: 'emptyReconcile', notices: issues};
  }

  const hasChanges = response.changes.length > 0;

  if (!hasChanges) {
    return {kind: 'emptyReconcile', notices: issues};
  }

  return {kind: 'review', notices, response};
}

export interface FinalizeDeps {
  commitChanges: typeof commitChanges;
  endSession: typeof endSession;
  stageChanges: typeof stageChanges;
}

export interface FinalizeArgs {
  checkedChangeIds: string[];
  processedFromPrevAttempt: string[];
  projectId: string;
}

async function finalizeEndSession(
  deps: FinalizeDeps,
  projectId: string,
): Promise<FinalizeOutcome> {
  const result = await deps.endSession(projectId);

  if (result.data?.sessionMode === 'READONLY') {
    return {
      kind: 'committed',
      sessionMode: result.data.sessionMode,
      summary: result.data.summary,
    };
  }

  const code = getTransportHttpStatus(result);
  if (code === 400 || code === 422) {
    return {
      code: String(code) as '400' | '422',
      kind: 'endSessionDeterminate',
      message: getIssueMessage(result, 'failed'),
    };
  }

  if (!isTransportFailure(result) || code !== undefined) {
    return {kind: 'endSessionPostCommitReloadNeeded'};
  }

  const retryResult = await deps.endSession(projectId);

  if (retryResult.data?.sessionMode === 'READONLY') {
    return {
      kind: 'committed',
      sessionMode: retryResult.data.sessionMode,
      summary: retryResult.data.summary,
    };
  }

  if (
    isTransportFailure(retryResult) &&
    getTransportHttpStatus(retryResult) === undefined
  ) {
    return {kind: 'endSessionTransportIndeterminate'};
  }

  return {kind: 'endSessionPostCommitReloadNeeded'};
}

export async function runFinalize(
  deps: FinalizeDeps,
  args: FinalizeArgs,
): Promise<FinalizeOutcome> {
  const {checkedChangeIds, processedFromPrevAttempt, projectId} = args;

  const notYetStagedChangeIds = checkedChangeIds.filter(
    (id) => !processedFromPrevAttempt.includes(id),
  );

  if (notYetStagedChangeIds.length > 0) {
    const stageResult = await deps.stageChanges(
      projectId,
      notYetStagedChangeIds,
    );

    if (isTransportFailure(stageResult) && !stageResult.data) {
      return {kind: 'stageTransportIndeterminate'};
    }

    const stageFailedChangeIds = stageResult.data?.failedChangeIds ?? [];
    if (
      hasBlockingIssues(stageResult) ||
      stageResult.data?.success === false ||
      stageFailedChangeIds.length > 0
    ) {
      const stageProcessedChangeIds =
        stageResult.data?.processedChangeIds ?? [];
      const alreadyProcessed = new Set([
        ...processedFromPrevAttempt,
        ...stageProcessedChangeIds,
      ]);

      return {
        failedChangeIds: stageFailedChangeIds,
        issues: undefined,
        kind: 'stageFailed',
        message: getIssueMessage(
          stageResult,
          stageResult.data?.message ?? 'Stage changes failed',
        ),
        notYetStagedChangeIds: checkedChangeIds.filter(
          (id) => !alreadyProcessed.has(id),
        ),
        processedChangeIds: stageProcessedChangeIds,
      };
    }
  }

  const commitResult = await deps.commitChanges(projectId, undefined, true);

  if (isTransportFailure(commitResult) && !commitResult.data) {
    return {kind: 'commitTransportIndeterminate'};
  }

  const commitFailedChangeIds = commitResult.data?.failedChangeIds ?? [];
  const commitProcessedChangeIds = commitResult.data?.processedChangeIds ?? [];

  if (
    hasBlockingIssues(commitResult) ||
    commitResult.data?.success === false ||
    (commitFailedChangeIds.length > 0 && commitProcessedChangeIds.length === 0)
  ) {
    return {
      failedChangeIds: commitResult.data?.failedChangeIds,
      issues: undefined,
      kind: 'commitRejected',
      message: getIssueMessage(
        commitResult,
        commitResult.data?.message ?? 'Commit changes failed',
      ),
      missingDependencies: commitResult.data?.missingDependencies,
    };
  }

  if (commitFailedChangeIds.length > 0 && commitProcessedChangeIds.length > 0) {
    return {
      failedChangeIds: commitFailedChangeIds,
      kind: 'commitPartial',
      message: getIssueMessage(
        commitResult,
        commitResult.data?.message ?? 'Commit changes partially failed',
      ),
      processedChangeIds: commitProcessedChangeIds,
    };
  }

  return finalizeEndSession(deps, projectId);
}

export interface DiscardDeps {
  discardChanges: typeof discardChanges;
  endSession: typeof endSession;
}

export interface DiscardArgs {
  projectId: string;
}

async function discardEndSession(
  deps: DiscardDeps,
  projectId: string,
  cascadedChangeIds: string[],
): Promise<DiscardOutcome> {
  const result = await deps.endSession(projectId);

  if (result.data?.sessionMode === 'READONLY') {
    return {cascadedChangeIds, kind: 'discarded'};
  }

  const code = getTransportHttpStatus(result);
  if (code === 400 || code === 422) {
    return {
      code: String(code) as '400' | '422',
      kind: 'endSessionDeterminate',
      message: getIssueMessage(result, 'failed'),
    };
  }

  if (!isTransportFailure(result) || code !== undefined) {
    return {kind: 'endSessionPostDiscardReloadNeeded'};
  }

  const retryResult = await deps.endSession(projectId);

  if (retryResult.data?.sessionMode === 'READONLY') {
    return {cascadedChangeIds, kind: 'discarded'};
  }

  if (
    isTransportFailure(retryResult) &&
    getTransportHttpStatus(retryResult) === undefined
  ) {
    return {kind: 'discardTransportIndeterminate'};
  }

  return {kind: 'endSessionPostDiscardReloadNeeded'};
}

export async function runDiscard(
  deps: DiscardDeps,
  args: DiscardArgs,
): Promise<DiscardOutcome> {
  const {projectId} = args;

  const discardResult = await deps.discardChanges(projectId);

  if (isTransportFailure(discardResult) && !discardResult.data) {
    return {kind: 'discardChangesTransportIndeterminate'};
  }

  const discardFailedChangeIds = discardResult.data?.failedChangeIds ?? [];

  if (
    hasBlockingIssues(discardResult) ||
    discardResult.data?.success === false ||
    discardFailedChangeIds.length > 0
  ) {
    return {
      failedChangeIds: discardResult.data?.failedChangeIds,
      issues: undefined,
      kind: 'discardDeterminate',
      message: getIssueMessage(
        discardResult,
        discardResult.data?.message ?? 'Discard changes failed',
      ),
    };
  }

  const cascadedChangeIds = discardResult.data?.cascadedChangeIds ?? [];

  return discardEndSession(deps, projectId, cascadedChangeIds);
}
