/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export function isPolicyVisible(
  policy: 'ADVANCED' | 'BASIC' | 'HIDDEN' | undefined,
  policyFilter: Set<'ADVANCED' | 'BASIC'>,
): boolean {
  if (policy === 'HIDDEN') {
    return false;
  }
  if (policy === 'BASIC' && !policyFilter.has('BASIC')) {
    return false;
  }
  if (policy === 'ADVANCED' && !policyFilter.has('ADVANCED')) {
    return false;
  }
  return true;
}
