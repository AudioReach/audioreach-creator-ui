/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem} from '~entities/api-issues';

export function isBlockingIssue(issue: ApiIssueItem): boolean {
  return (
    issue.category === 'BLOCKING' ||
    issue.severity === 'FATAL' ||
    issue.severity === 'ERROR'
  );
}

export function partitionIssues(issues: readonly ApiIssueItem[]): {
  blocking: ApiIssueItem[];
  notices: ApiIssueItem[];
} {
  const blocking: ApiIssueItem[] = [];
  const notices: ApiIssueItem[] = [];

  for (const issue of issues) {
    if (isBlockingIssue(issue)) {
      blocking.push(issue);
    } else {
      notices.push(issue);
    }
  }

  return {blocking, notices};
}
