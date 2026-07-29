/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ApiIssueItem, IssueSeverity} from '~entities/api-issues';
import type {
  SeverityType,
  ValidationResult,
} from '~shared/store/tab-store-slices/validation-result-slice';

const SEVERITY_MAP: Record<IssueSeverity, SeverityType> = {
  ERROR: 'error',
  FATAL: 'critical',
  WARNING: 'warning',
};

export function mapIssueToValidationResult(
  issue: ApiIssueItem,
): Omit<ValidationResult, 'id'> {
  const result: Omit<ValidationResult, 'id'> = {
    errorCode: issue.code,
    message: issue.message,
    severity: SEVERITY_MAP[issue.severity],
  };

  if (issue.impactedEntity) {
    const {entityType, systemId} = issue.impactedEntity;

    if (entityType === 'SpfModule') {
      result.moduleInstanceId = systemId;
    } else if (entityType === 'Subgraph') {
      result.subgraphId = systemId;
    } else if (entityType === 'DataLink' || entityType === 'ControlLink') {
      result.connectionId = systemId;
    }
  }

  if (issue.fixOptions && issue.fixOptions.length > 0) {
    result.canShowControls = true;
  }

  return result;
}
