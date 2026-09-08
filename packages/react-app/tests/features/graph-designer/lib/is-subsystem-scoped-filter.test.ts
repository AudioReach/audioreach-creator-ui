/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {isSubsystemScopedFilter} from '~features/graph-designer/lib/is-subsystem-scoped-filter';
import {
  DEFAULT_USECASE_PREFERENCES,
  WORKFLOW_LEVELS,
  WORKFLOW_TYPES,
} from '~shared/config/user-preferences-types';

describe('isSubsystemScopedFilter', () => {
  it('returns true for subsystem-level usecase workflows', () => {
    expect(
      isSubsystemScopedFilter({
        ...DEFAULT_USECASE_PREFERENCES,
        workflowLevel: WORKFLOW_LEVELS.SUBSYSTEM,
      }),
    ).toBe(true);
  });

  it('returns true for system workflows', () => {
    expect(
      isSubsystemScopedFilter({
        ...DEFAULT_USECASE_PREFERENCES,
        workflowType: WORKFLOW_TYPES.SYSTEM,
      }),
    ).toBe(true);
  });

  it('returns false for usecase-level usecase workflows', () => {
    expect(isSubsystemScopedFilter(DEFAULT_USECASE_PREFERENCES)).toBe(false);
  });
});
