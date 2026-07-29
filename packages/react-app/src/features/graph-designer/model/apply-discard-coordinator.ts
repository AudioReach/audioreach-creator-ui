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
import type {ApiResult} from '~shared/api';

import {partitionIssues} from '../lib/issue-gate';

import type {
  DiscardOutcome,
  FinalizeOutcome,
  ReconcileOutcome,
} from './apply-discard.types';

export function parseHttpStatus(
  result: ApiResult<unknown>,
): number | undefined {
  const text = [result.message, ...(result.errors ?? [])].join(' ');
  const match = /\bHTTP error:\s*(\d{3})\b/.exec(text);
  return match ? Number(match[1]) : undefined;
}

export function isTransportFailure(result: ApiResult<unknown>): boolean {
  return (
    !result.success && !result.data && parseHttpStatus(result) === undefined
  );
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

  if (isTransportFailure(result)) {
    return {kind: 'reconcileTransportIndeterminate'};
  }

  if (!result.success) {
    return {kind: 'reconcileFailed', message: result.message};
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

  const hasChanges =
    response.created.length > 0 ||
    response.updated.length > 0 ||
    response.deleted.length > 0;

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

  if (result.success && result.data?.sessionMode === 'READONLY') {
    return {
      kind: 'committed',
      sessionMode: result.data.sessionMode,
      summary: result.data.summary,
    };
  }

  if (!result.success) {
    const code = parseHttpStatus(result);
    if (code === 400 || code === 422) {
      return {
        code: String(code) as '400' | '422',
        kind: 'endSessionDeterminate',
        message: result.message,
      };
    }
  }

  if (!isTransportFailure(result)) {
    return {kind: 'endSessionTransportIndeterminate'};
  }

  const retryResult = await deps.endSession(projectId);

  if (retryResult.success && retryResult.data?.sessionMode === 'READONLY') {
    return {
      kind: 'committed',
      sessionMode: retryResult.data.sessionMode,
      summary: retryResult.data.summary,
    };
  }

  if (isTransportFailure(retryResult)) {
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

    if (isTransportFailure(stageResult)) {
      return {kind: 'stageTransportIndeterminate'};
    }

    const stageFailedChangeIds = stageResult.data?.failedChangeIds ?? [];
    if (!stageResult.success || stageFailedChangeIds.length > 0) {
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
        message: stageResult.message,
        notYetStagedChangeIds: checkedChangeIds.filter(
          (id) => !alreadyProcessed.has(id),
        ),
        processedChangeIds: stageProcessedChangeIds,
      };
    }
  }

  const commitResult = await deps.commitChanges(projectId, undefined, true);

  if (isTransportFailure(commitResult)) {
    return {kind: 'commitTransportIndeterminate'};
  }

  const commitFailedChangeIds = commitResult.data?.failedChangeIds ?? [];
  const commitProcessedChangeIds = commitResult.data?.processedChangeIds ?? [];

  if (
    !commitResult.success ||
    (commitFailedChangeIds.length > 0 && commitProcessedChangeIds.length === 0)
  ) {
    return {
      failedChangeIds: commitResult.data?.failedChangeIds,
      issues: undefined,
      kind: 'commitRejected',
      message: commitResult.message,
      missingDependencies: commitResult.data?.missingDependencies,
    };
  }

  if (commitFailedChangeIds.length > 0 && commitProcessedChangeIds.length > 0) {
    return {
      failedChangeIds: commitFailedChangeIds,
      kind: 'commitPartial',
      message: commitResult.message,
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

  if (result.success && result.data?.sessionMode === 'READONLY') {
    return {cascadedChangeIds, kind: 'discarded'};
  }

  if (!result.success) {
    const code = parseHttpStatus(result);
    if (code === 400 || code === 422) {
      return {
        code: String(code) as '400' | '422',
        kind: 'endSessionDeterminate',
        message: result.message,
      };
    }
  }

  if (!isTransportFailure(result)) {
    return {kind: 'endSessionPostDiscardReloadNeeded'};
  }

  const retryResult = await deps.endSession(projectId);

  if (retryResult.success && retryResult.data?.sessionMode === 'READONLY') {
    return {cascadedChangeIds, kind: 'discarded'};
  }

  if (isTransportFailure(retryResult)) {
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

  if (isTransportFailure(discardResult)) {
    return {kind: 'discardChangesTransportIndeterminate'};
  }

  const discardFailedChangeIds = discardResult.data?.failedChangeIds ?? [];

  if (!discardResult.success || discardFailedChangeIds.length > 0) {
    return {
      failedChangeIds: discardResult.data?.failedChangeIds,
      issues: undefined,
      kind: 'discardDeterminate',
      message: discardResult.message,
    };
  }

  const cascadedChangeIds = discardResult.data?.cascadedChangeIds ?? [];

  return discardEndSession(deps, projectId, cascadedChangeIds);
}
