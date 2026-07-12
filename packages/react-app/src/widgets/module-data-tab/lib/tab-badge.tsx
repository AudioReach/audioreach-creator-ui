/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {StatusBadge} from '@qualcomm-ui/react/badge';

import {
  hasInvalidPaths,
  hasSetPaths,
  isUiStateDirty,
} from '~shared/lib/tree-view-ui-state';
import type {GenericTreeViewUiState} from '~shared/types/tree-view-ui-state';

export function tabBadge(uiState?: GenericTreeViewUiState) {
  if (hasInvalidPaths(uiState)) {
    return <StatusBadge emphasis="danger" size="xs" />;
  }
  if (isUiStateDirty(uiState)) {
    return <StatusBadge className="dirty-pulse" emphasis="warning" size="xs" />;
  }
  if (hasSetPaths(uiState)) {
    return <StatusBadge emphasis="success" size="xs" />;
  }
  return undefined;
}
