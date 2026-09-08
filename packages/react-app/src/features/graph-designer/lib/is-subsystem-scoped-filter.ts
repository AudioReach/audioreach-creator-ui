/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  WORKFLOW_LEVELS,
  WORKFLOW_TYPES,
  type UsecasePreferences,
} from '~shared/config/user-preferences-types';

export function isSubsystemScopedFilter(
  preferences: UsecasePreferences,
): boolean {
  return (
    preferences.workflowLevel === WORKFLOW_LEVELS.SUBSYSTEM ||
    preferences.workflowType === WORKFLOW_TYPES.SYSTEM
  );
}
