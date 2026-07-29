/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem} from '~entities/api-issues';
import {mapIssueToValidationResult} from '~features/graph-designer/lib/map-issue-to-validation-result';
import type {ValidationResult} from '~shared/store/tab-store-slices/validation-result-slice';

export type ReportableFinalizeError =
  | {
      failedChangeIds: string[];
      issues?: ApiIssueItem[];
      kind: 'stageFailed';
      message: string;
      notYetStagedChangeIds: string[];
      processedChangeIds: string[];
    }
  | {
      failedChangeIds?: string[];
      issues?: ApiIssueItem[];
      kind: 'commitRejected';
      message: string;
      missingDependencies?: string[];
    }
  | {
      failedChangeIds: string[];
      kind: 'commitPartial';
      message: string;
      processedChangeIds: string[];
    }
  | {
      failedChangeIds?: string[];
      issues?: ApiIssueItem[];
      kind: 'discardDeterminate';
      message: string;
    }
  | {
      code: '422' | '400';
      kind: 'endSessionDeterminate';
      message: string;
    }
  | {
      kind: 'reconcileFailed';
      message: string;
    };

function joinOrDash(ids: string[]): string {
  return ids.length > 0 ? ids.join(', ') : '—';
}

function mapIssues(issues: ApiIssueItem[]): Omit<ValidationResult, 'id'>[] {
  return issues.map((issue) => mapIssueToValidationResult(issue));
}

function mapStageFailed(
  error: Extract<ReportableFinalizeError, {kind: 'stageFailed'}>,
): Omit<ValidationResult, 'id'>[] {
  const issueRows = error.issues ? mapIssues(error.issues) : [];

  const summaryRow: Omit<ValidationResult, 'id'> = {
    errorCode: 'stage-changes-failed',
    errorDetails: [
      `Processed: ${joinOrDash(error.processedChangeIds)}`,
      `Failed: ${joinOrDash(error.failedChangeIds)}`,
      `Not yet staged (retry set): ${joinOrDash(error.notYetStagedChangeIds)}`,
    ].join('\n'),
    message: error.message,
    severity: 'error',
  };

  return [...issueRows, summaryRow];
}

function mapCommitRejected(
  error: Extract<ReportableFinalizeError, {kind: 'commitRejected'}>,
): Omit<ValidationResult, 'id'>[] {
  const hasMissingDependencies = (error.missingDependencies?.length ?? 0) > 0;
  const hasFailedChangeIds = (error.failedChangeIds?.length ?? 0) > 0;
  const hasIssues = (error.issues?.length ?? 0) > 0;

  if (hasIssues) {
    const issueRows = mapIssues(error.issues ?? []);

    if (!hasMissingDependencies && !hasFailedChangeIds) {
      return issueRows;
    }

    const sections: string[] = [];
    if (hasMissingDependencies) {
      sections.push(
        `Missing dependencies: ${joinOrDash(error.missingDependencies ?? [])}`,
      );
    }
    if (hasFailedChangeIds) {
      sections.push(`Failed: ${joinOrDash(error.failedChangeIds ?? [])}`);
    }

    const summaryRow: Omit<ValidationResult, 'id'> = {
      errorCode: 'commit-changes-rejected',
      errorDetails: sections.join('\n'),
      message: error.message,
      severity: 'error',
    };

    return [...issueRows, summaryRow];
  }

  if (!hasMissingDependencies && !hasFailedChangeIds) {
    return [
      {
        errorCode: 'commit-changes-rejected',
        message: error.message,
        severity: 'error',
      },
    ];
  }

  const sections: string[] = [];
  if (hasMissingDependencies) {
    sections.push(
      `Missing dependencies: ${joinOrDash(error.missingDependencies ?? [])}`,
    );
  }
  if (hasFailedChangeIds) {
    sections.push(`Failed: ${joinOrDash(error.failedChangeIds ?? [])}`);
  }

  return [
    {
      errorCode: 'commit-changes-rejected',
      errorDetails: sections.join('\n'),
      message: error.message,
      severity: 'error',
    },
  ];
}

function mapCommitPartial(
  error: Extract<ReportableFinalizeError, {kind: 'commitPartial'}>,
): Omit<ValidationResult, 'id'>[] {
  return [
    {
      errorCode: 'commit-changes-partial',
      errorDetails: [
        `Committed: ${joinOrDash(error.processedChangeIds)}`,
        `Still staged: ${joinOrDash(error.failedChangeIds)}`,
      ].join('\n'),
      message: error.message,
      severity: 'warning',
    },
  ];
}

function mapDiscardDeterminate(
  error: Extract<ReportableFinalizeError, {kind: 'discardDeterminate'}>,
): Omit<ValidationResult, 'id'>[] {
  const hasFailedChangeIds = (error.failedChangeIds?.length ?? 0) > 0;
  const hasIssues = (error.issues?.length ?? 0) > 0;

  if (hasIssues) {
    const issueRows = mapIssues(error.issues ?? []);

    if (!hasFailedChangeIds) {
      return issueRows;
    }

    const summaryRow: Omit<ValidationResult, 'id'> = {
      errorCode: 'discard-changes-failed',
      errorDetails: `Failed: ${joinOrDash(error.failedChangeIds ?? [])}`,
      message: error.message,
      severity: 'error',
    };

    return [...issueRows, summaryRow];
  }

  const summaryRow: Omit<ValidationResult, 'id'> = {
    errorCode: 'discard-changes-failed',
    message: error.message,
    severity: 'error',
  };

  if (hasFailedChangeIds) {
    summaryRow.errorDetails = `Failed: ${joinOrDash(error.failedChangeIds ?? [])}`;
  }

  return [summaryRow];
}

function mapEndSessionDeterminate(
  error: Extract<ReportableFinalizeError, {kind: 'endSessionDeterminate'}>,
): Omit<ValidationResult, 'id'>[] {
  return [
    {
      errorCode:
        error.code === '422'
          ? 'end-session-staged-changes-exist'
          : 'end-session-no-active-session',
      message: error.message,
      severity: 'error',
    },
  ];
}

function mapReconcileFailed(
  error: Extract<ReportableFinalizeError, {kind: 'reconcileFailed'}>,
): Omit<ValidationResult, 'id'>[] {
  return [
    {
      errorCode: 'create-usecases-failed',
      message: error.message,
      severity: 'error',
    },
  ];
}

export function mapFinalizeErrorToValidationResults(
  error: ReportableFinalizeError,
): Omit<ValidationResult, 'id'>[] {
  switch (error.kind) {
    case 'stageFailed':
      return mapStageFailed(error);
    case 'commitRejected':
      return mapCommitRejected(error);
    case 'commitPartial':
      return mapCommitPartial(error);
    case 'discardDeterminate':
      return mapDiscardDeterminate(error);
    case 'endSessionDeterminate':
      return mapEndSessionDeterminate(error);
    case 'reconcileFailed':
      return mapReconcileFailed(error);
  }
}
