/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssue, ApiResult} from './api-response.types';

const transportIssuePrefix = 'TRANSPORT_';

const severityRank: Record<ApiIssue['severity'], number> = {
  ERROR: 2,
  FATAL: 3,
  WARNING: 1,
};

export function createTransportIssue(code: string, message: string): ApiIssue {
  return {
    code: code.startsWith(transportIssuePrefix)
      ? code
      : `${transportIssuePrefix}${code}`,
    message,
    severity: 'ERROR',
  };
}

export function getIssueMessage(
  result: ApiResult<unknown> | undefined,
  fallback: string,
): string {
  const highestIssue = result?.issues
    ?.filter((issue) => issue.message.trim().length > 0)
    .toSorted(
      (left, right) =>
        severityRank[right.severity] - severityRank[left.severity],
    )[0];

  return highestIssue?.message ?? fallback;
}

export function hasBlockingIssues(
  result: ApiResult<unknown> | undefined,
): boolean {
  return (
    result?.issues?.some(
      (issue) => issue.severity === 'ERROR' || issue.severity === 'FATAL',
    ) ?? false
  );
}

export function hasIssues(result: ApiResult<unknown> | undefined): boolean {
  return (result?.issues?.length ?? 0) > 0;
}

export function isTransportFailure(
  result: ApiResult<unknown> | undefined,
): boolean {
  return (
    result?.issues?.some((issue) =>
      issue.code.startsWith(transportIssuePrefix),
    ) ?? false
  );
}
