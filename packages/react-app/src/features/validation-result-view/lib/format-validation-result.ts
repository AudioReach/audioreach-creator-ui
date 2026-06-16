/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ValidationResult} from '~shared/store/tab-store-slices/validation-result-slice';

export function formatValidationResult(result: ValidationResult): string {
  const prefix = result.errorCode
    ? `[${result.severity.toUpperCase()}] ${result.errorCode}: ${result.message}`
    : `[${result.severity.toUpperCase()}] ${result.message}`;
  return result.errorDetails ? `${prefix}\n${result.errorDetails}` : prefix;
}
