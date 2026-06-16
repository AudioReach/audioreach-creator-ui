/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {filterByTypeAndQuery} from '~shared/lib/filter-utils';
import type {
  SeverityType,
  ValidationResult,
} from '~shared/store/tab-store-slices/validation-result-slice';

export function filterValidationResults(
  results: ValidationResult[],
  selectedSeverities: SeverityType[],
  query: string,
): ValidationResult[] {
  return filterByTypeAndQuery(
    results,
    selectedSeverities,
    (result) => result.severity,
    query,
    (result) => [result.message, result.errorCode, result.errorDetails],
  );
}
